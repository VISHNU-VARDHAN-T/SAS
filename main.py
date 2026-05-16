import os
import json
import shutil
import uuid
import tempfile
from datetime import datetime, date
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from deepface import DeepFace
from supabase import create_client

# --- Config ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Startup: pre-load model ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading ArcFace model...")
    DeepFace.build_model("ArcFace")
    print("Model ready.")
    yield

app = FastAPI(lifespan=lifespan)

# --- Helpers ---
def get_embedding(img_path: str) -> list:
    result = DeepFace.represent(
        img_path=img_path,
        model_name="ArcFace",
        enforce_detection=False
    )
    return result[0]["embedding"]

def cosine_sim(a: list, b: list) -> float:
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

# --- Routes ---
@app.get("/")
async def health():
    return {"status": "ok"}

@app.post("/register")
async def register(name: str = Form(...), file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp = tmp_file.name

    try:
        embedding = get_embedding(tmp)

        # Upload photo to Supabase Storage
        with open(tmp, "rb") as f:
            photo_name = f"{name}_{uuid.uuid4()}.jpg"
            sb.storage.from_("photos").upload(photo_name, f)

        # Store embedding in DB
        sb.table("embeddings").insert({
            "name": name,
            "embedding": json.dumps(embedding)
        }).execute()

        return {"status": "registered", "name": name}

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "detail": str(e)}
        )
    finally:
        os.remove(tmp)

@app.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp = tmp_file.name

    try:
        query_emb = get_embedding(tmp)
    except Exception as e:
        return {"name": "Unknown", "confidence": 0.0, "error": str(e)}
    finally:
        os.remove(tmp)

    # Fetch all embeddings and find best match
    rows = sb.table("embeddings").select("name, embedding").execute().data
    best_name, best_score = "Unknown", 0.0

    for row in rows:
        score = cosine_sim(query_emb, json.loads(row["embedding"]))
        if score > best_score:
            best_score, best_name = score, row["name"]

    if best_score > 0.68:
        # Deduplication: only mark attendance once per day
        today = date.today().isoformat()
        existing = sb.table("attendance")\
            .select("id")\
            .eq("name", best_name)\
            .gte("timestamp", today)\
            .execute()

        if not existing.data:
            sb.table("attendance").insert({
                "name": best_name,
                "confidence": best_score,
                "timestamp": datetime.utcnow().isoformat()
            }).execute()
            return {
                "name": best_name,
                "confidence": round(best_score, 3),
                "status": "marked_present"
            }
        else:
            return {
                "name": best_name,
                "confidence": round(best_score, 3),
                "status": "already_marked"
            }

    return {
        "name": "Unknown",
        "confidence": round(best_score, 3),
        "status": "unknown"
    }

@app.get("/attendance")
async def get_attendance(date_filter: str = None):
    """Get attendance records, optionally filtered by date (YYYY-MM-DD)."""
    query = sb.table("attendance").select("*").order("timestamp", desc=True)
    if date_filter:
        query = query.gte("timestamp", date_filter).lt(
            "timestamp", date_filter + "T23:59:59"
        )
    result = query.execute()
    return {"records": result.data, "count": len(result.data)}

# --- Entry point ---
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)

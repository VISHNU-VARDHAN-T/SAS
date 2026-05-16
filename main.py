from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from deepface import DeepFace
from supabase import create_client
import numpy as np, json, os, shutil, uuid
from datetime import datetime

app = FastAPI()

SUPABASE_URL = "https://martmxqxgqnexjkhnevg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcnRteHF4Z3FuZXhqa2huZXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTM1MDMsImV4cCI6MjA5MjMyOTUwM30.hjnjuTfI9iYy4sdMqOYXS4NCTCRbzXnFO6vfOwbLyIY"

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_embedding(img_path):
    result = DeepFace.represent(img_path=img_path, model_name="ArcFace", enforce_detection=False)
    return result[0]["embedding"]

def cosine_sim(a, b):
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

@app.post("/register")
async def register(name: str = Form(...), file: UploadFile = File(...)):
    tmp = f"/tmp/{uuid.uuid4()}.jpg"
    with open(tmp, "wb") as f:
        shutil.copyfileobj(file.file, f)
    embedding = get_embedding(tmp)
    # Upload photo to Supabase Storage
    with open(tmp, "rb") as f:
        sb.storage.from_("photos").upload(f"{name}_{uuid.uuid4()}.jpg", f)
    # Store embedding in DB
    sb.table("embeddings").insert({"name": name, "embedding": json.dumps(embedding)}).execute()
    os.remove(tmp)
    return {"status": "registered", "name": name}

@app.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    tmp = f"/tmp/{uuid.uuid4()}.jpg"
    with open(tmp, "wb") as f:
        shutil.copyfileobj(file.file, f)
    try:
        query_emb = get_embedding(tmp)
    except:
        os.remove(tmp)
        return {"name": "Unknown", "confidence": 0.0}
    
    rows = sb.table("embeddings").select("name, embedding").execute().data
    best_name, best_score = "Unknown", 0.0
    for row in rows:
        score = cosine_sim(query_emb, json.loads(row["embedding"]))
        if score > best_score:
            best_score, best_name = score, row["name"]
    
    os.remove(tmp)
    if best_score > 0.68:   # tune this threshold
        sb.table("attendance").insert({
            "name": best_name,
            "confidence": best_score,
            "timestamp": datetime.utcnow().isoformat()
        }).execute()
        return {"name": best_name, "confidence": round(best_score, 3), "status": "present"}
    return {"name": "Unknown", "confidence": round(best_score, 3), "status": "unknown"}

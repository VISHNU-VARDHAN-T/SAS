'use client'
import { useState, useRef } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function RegisterPage() {
  const [name, setName]       = useState('')
  const [file, setFile]       = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [msg, setMsg]         = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)

  function onFile(f: File | null | undefined) {
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  async function submit() {
    if (!name.trim() || !file) {
      setMsg({ type: 'error', text: 'Please enter a name and select a photo.' })
      return
    }
    setLoading(true)
    setMsg(null)

    const form = new FormData()
    form.append('name', name.trim())
    form.append('file', file)

    try {
      const res  = await fetch(`${API}/register`, { method: 'POST', body: form })
      const json = await res.json()

      if (json.status === 'registered') {
        setMsg({ type: 'success', text: `✓ ${json.name} enrolled successfully!` })
        setName(''); setFile(null); setPreview(null)
      } else {
        setMsg({ type: 'error', text: json.detail || 'Registration failed.' })
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'Cannot reach API server. Check your ngrok URL.' })
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h1 className="page-title">Enroll Person</h1>
      <p className="page-sub">Add a new face to the recognition database</p>

      <div className="card">
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            className="form-input"
            placeholder="e.g. Ravi Kumar"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Photo</label>
          <div
            className={`upload-zone ${file ? 'drag' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files[0]) }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => onFile(e.target.files?.[0])}
            />
            {preview ? (
              <>
                <img src={preview} alt="preview" className="preview-img" style={{ margin: '0 auto' }} />
                <p style={{ marginTop: 10, color: 'var(--accent)', fontSize: 12 }}>
                  {file?.name}
                </p>
              </>
            ) : (
              <>
                <div className="upload-icon">📷</div>
                <p style={{ color: 'var(--text)', marginBottom: 4 }}>Drop photo here or click to browse</p>
                <p className="upload-hint">JPG, PNG — clear front-facing photo works best</p>
              </>
            )}
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 13, letterSpacing: 2 }}
        >
          {loading ? 'Enrolling...' : '+ ENROLL'}
        </button>

        {msg && (
          <div className={`alert alert-${msg.type}`}>{msg.text}</div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-label">Tips for best results</div>
        <ul style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 2, paddingLeft: 16, marginTop: 8 }}>
          <li>Use a well-lit, front-facing photo</li>
          <li>Only one face in the image</li>
          <li>Avoid sunglasses or face coverings</li>
          <li>Higher resolution = better accuracy</li>
        </ul>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'

export default function Register() {
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState('')

  async function submit() {
    if (!name || !file) return
    const form = new FormData()
    form.append('name', name)
    form.append('file', file)
    const res = await fetch('https://YOUR_APP.onrender.com/register', { method: 'POST', body: form })
    const json = await res.json()
    setMsg(json.status === 'registered' ? `${json.name} enrolled!` : 'Error')
  }

  return (
    <main style={{ padding: '2rem', maxWidth: 400 }}>
      <h1>Enroll new person</h1>
      <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} style={{ display: 'block', marginBottom: 12, padding: 8, width: '100%' }}/>
      <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ display: 'block', marginBottom: 12 }}/>
      <button onClick={submit} style={{ padding: '8px 24px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Register</button>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  )
}
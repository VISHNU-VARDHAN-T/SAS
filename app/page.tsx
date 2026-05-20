'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Log {
  id: number
  name: string
  confidence: number
  timestamp: string
  status: string
  unit_id?: string
  location?: string
}

export default function Dashboard() {
  const [logs, setLogs]       = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [lastEvent, setLastEvent] = useState<Log | null>(null)
  const [flash, setFlash]     = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const fetchLogs = useCallback(async () => {
    const { data } = await sb
      .from('attendance')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100)
    if (data) setLogs(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLogs()

    const channel = sb.channel('attendance-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance' }, payload => {
        const row = payload.new as Log
        setLogs(prev => [row, ...prev])
        setLastEvent(row)
        setFlash(true)
        setTimeout(() => setFlash(false), 800)
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [fetchLogs])

  const todayLogs  = logs.filter(l => l.timestamp?.startsWith(today))
  const uniqueToday = new Set(todayLogs.map(l => l.name)).size
  const cam1Count  = todayLogs.filter(l => l.unit_id === 'CAM_1').length
  const cam2Count  = todayLogs.filter(l => l.unit_id === 'CAM_2').length

  const fmt = (ts: string) => new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
  })

  const statusBadge = (s: string) => {
    if (s === 'marked_present') return <span className="badge badge-present">Present</span>
    if (s === 'already_marked') return <span className="badge badge-already">Already In</span>
    return <span className="badge badge-unknown">Unknown</span>
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="live-row">
          <span className="live-dot" />
          LIVE
        </div>
      </div>

      {/* Last detection toast */}
      {lastEvent && (
        <div className={`alert ${lastEvent.status === 'unknown' ? 'alert-error' : 'alert-success'}`}
          style={{ marginBottom: 24, transition: 'all 0.3s', opacity: flash ? 1 : 0.7 }}>
          ⚡ {lastEvent.status === 'marked_present' ? `${lastEvent.name} marked present` :
              lastEvent.status === 'already_marked' ? `${lastEvent.name} already marked` :
              'Unknown person detected'} — {fmt(lastEvent.timestamp)}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: "Today's Entries", value: todayLogs.length, color: 'var(--accent)' },
          { label: 'Unique People',   value: uniqueToday,      color: '#fff' },
          { label: 'CAM 1',           value: cam1Count,        color: 'var(--accent)' },
          { label: 'CAM 2',           value: cam2Count,        color: 'var(--accent2)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center' }}>
            <div className="card-label">{s.label}</div>
            <div className="card-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-head">
          <span className="table-head-title">Recent Detections</span>
          <button className="btn btn-ghost" onClick={fetchLogs}>↻ Refresh</button>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
            No detections yet. Cameras are watching...
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Name</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{fmt(log.timestamp)}</td>
                  <td style={{ fontWeight: 500, color: log.name === 'Unknown' ? 'var(--warn)' : '#fff' }}>
                    {log.name}
                  </td>
                  <td>{statusBadge(log.status)}</td>
                  <td>
                    <div className="conf-wrap">
                      <div className="conf-bar">
                        <div className="conf-fill" style={{
                          width: `${(log.confidence * 100).toFixed(0)}%`,
                          background: log.confidence > 0.85 ? 'var(--accent)' : log.confidence > 0.75 ? 'var(--accent2)' : 'var(--warn)'
                        }} />
                      </div>
                      <span className="conf-text">{(log.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td>
                    {log.unit_id ? (
                      <span className={`badge ${log.unit_id === 'CAM_1' ? 'badge-cam1' : 'badge-cam2'}`}>
                        {log.unit_id}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

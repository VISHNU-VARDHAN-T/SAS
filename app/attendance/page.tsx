'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AttendancePage() {
  const [logs, setLogs]     = useState<any[]>([])
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  async function fetch() {
    setLoading(true)
    const { data } = await sb
      .from('attendance')
      .select('*')
      .gte('timestamp', date + 'T00:00:00')
      .lte('timestamp', date + 'T23:59:59')
      .order('timestamp', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [date])

  const fmt = (ts: string) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  function exportCSV() {
    const rows = [['Name','Time','Confidence','Status','Unit']]
    logs.forEach(l => rows.push([l.name, l.timestamp, (l.confidence*100).toFixed(1)+'%', l.status, l.unit_id||'']))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv,' + encodeURIComponent(csv)
    a.download = `attendance_${date}.csv`
    a.click()
  }

  return (
    <div>
      <h1 className="page-title">Attendance Log</h1>
      <p className="page-sub">Filter by date — export CSV</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 28, alignItems: 'center' }}>
        <input
          type="date"
          className="form-input"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ width: 200 }}
        />
        <button className="btn btn-ghost" onClick={fetch}>↻</button>
        <button className="btn btn-primary" onClick={exportCSV}>↓ Export CSV</button>
        <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>
          {logs.length} record{logs.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>No records for {date}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Time</th><th>Confidence</th><th>Status</th><th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 500, color: log.name === 'Unknown' ? 'var(--warn)' : '#fff' }}>{log.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{fmt(log.timestamp)}</td>
                  <td>{(log.confidence * 100).toFixed(1)}%</td>
                  <td>
                    <span className={`badge ${
                      log.status === 'marked_present' ? 'badge-present' :
                      log.status === 'already_marked' ? 'badge-already' : 'badge-unknown'
                    }`}>
                      {log.status === 'marked_present' ? 'Present' :
                       log.status === 'already_marked' ? 'Already In' : 'Unknown'}
                    </span>
                  </td>
                  <td>
                    {log.unit_id
                      ? <span className={`badge ${log.unit_id === 'CAM_1' ? 'badge-cam1' : 'badge-cam2'}`}>{log.unit_id}</span>
                      : '—'}
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
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default async function Home() {
  const { data } = await sb.from('attendance').select('*').order('timestamp', { ascending: false }).limit(50)
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Attendance Log</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc' }}>
            <th style={{ textAlign: 'left', padding: '8px' }}>Name</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Time</th>
            <th style={{ textAlign: 'left', padding: '8px' }}>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {data?.map(row => (
            <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>{row.name}</td>
              <td style={{ padding: '8px' }}>{new Date(row.timestamp).toLocaleString('en-IN')}</td>
              <td style={{ padding: '8px' }}>{(row.confidence * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
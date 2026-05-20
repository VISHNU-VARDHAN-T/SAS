import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FaceGate — Attendance System',
  description: 'Real-time face recognition attendance dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <nav className="nav">
          <div className="nav-brand">
            <span className="nav-dot" />
            FACEGATE
          </div>
          <div className="nav-links">
            <a href="/">Dashboard</a>
            <a href="/register">Enroll</a>
            <a href="/attendance">Logs</a>
          </div>
        </nav>
        <main className="main-content">{children}</main>
      </body>
    </html>
  )
}

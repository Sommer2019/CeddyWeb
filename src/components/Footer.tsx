import React from 'react'

export default function Footer() {
  return (
    <footer style={{padding: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.03)', marginTop: '2rem'}}>
      <div className="container" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <strong>HD1920x1080</strong>
          <div style={{color: 'var(--muted)'}}>FullHD - Gaming, Streams & Clips</div>
        </div>
        <div style={{color: 'var(--muted)'}}>© {new Date().getFullYear()} HD1920x1080</div>
      </div>
    </footer>
  )
}


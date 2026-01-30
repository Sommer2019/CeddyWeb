import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{ padding: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.03)', marginTop: '2rem' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <strong>HD1920x1080</strong>
          <div style={{ color: 'var(--muted)' }}>FullHD - Gaming, Streams & Clips</div>
        </div>
        <div style={{ color: 'var(--muted)' }}>
          © {new Date().getFullYear()} HD1920x1080{' '}
          <Link to="/impressum" style={{ color: 'inherit' }}>Impressum</Link>
          {' | '}
          <Link to="/datenschutz" style={{ color: 'inherit' }}>Datenschutz</Link>
        </div>
      </div>
    </footer>
  )
}


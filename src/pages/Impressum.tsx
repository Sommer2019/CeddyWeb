import React from 'react'
import { Link } from 'react-router-dom'

export default function Impressum(): JSX.Element {
  return (
    <main className="container">
      <div>
        <div className="embed-card fullwidth">
          <h1 style={{ color: 'var(--accent)', marginTop: 0 }}>Impressum</h1>
          <p>
            <strong>Stefan Slapnik</strong>
            <br />
            FullHD Media
            <br />
            Kolpingstraße 9
            <br />
            95615 Marktredwitz
          </p>
          <p>
            Kontakt:{' '}
            <a href="mailto:Admin@HD1920x1080.de?subject=Anfrage%20Impressum">
              Admin@HD1920x1080.de
            </a>
          </p>
          <p style={{ marginTop: 18 }}>
            <Link to="/" className="btn">
              ← Zurück
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

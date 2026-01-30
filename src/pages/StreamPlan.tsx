import React from 'react'
import { Link } from 'react-router-dom'

const CALENDAR_URL =
  'https://kalender.digital/4ccef74582e0eb8d7026?view=list&utm_medium=social&utm_source=heylink.me'
const CALENDAR_LINK =
  'https://kalender.digital/4ccef74582e0eb8d7026?utm_medium=social'

export default function StreamPlan(): JSX.Element {
  return (
    <main className="container">
      <div>
        <h1 className="page-title">Streamplan</h1>
        <p>
          Hier findest du den aktuellen Streamplan von HD1920x1080. Bleib auf
          dem Laufenden über kommende Live-Streams und Events!
        </p>
        <div className="embed-card fullwidth">
          <a
            href={CALENDAR_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="embed-title">Stream-Kalender</div>
            <div className="responsive-embed">
              <iframe
                id="calendar-iframe"
                src={CALENDAR_URL}
                title="Stream Kalender"
                allowFullScreen
                style={{ width: '100%', minHeight: 400, border: 0 }}
              />
            </div>
          </a>
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

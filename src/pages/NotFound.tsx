import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound(): JSX.Element {
  return (
    <main
      className="container error-page"
      style={{
        minHeight: 'calc(100vh - 140px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
      }}
    >
      <div
        className="error-card"
        role="alert"
        aria-labelledby="err-title"
        style={{
          maxWidth: 720,
          width: '100%',
          background: 'var(--card-bg)',
          border: '1px solid var(--box-border)',
          padding: 28,
          borderRadius: 14,
          textAlign: 'center',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        }}
      >
        <img
          src="/img/logo128.png"
          alt="HD Logo"
          className="error-logo"
          style={{
            width: 160,
            height: 'auto',
            margin: '0 auto 18px',
            display: 'block',
          }}
        />
        <h1
          id="err-title"
          className="error-title"
          style={{
            fontSize: 28,
            color: 'var(--accent)',
            margin: '0 0 8px',
          }}
        >
          404 — Seite nicht gefunden
        </h1>
        <p
          className="error-text"
          style={{ color: 'var(--muted)', margin: 0 }}
        >
          Seite konnte nicht gefunden werden, zurück zur Startseite und
          Hawedere.
        </p>
        <div
          className="error-actions"
          style={{
            marginTop: 18,
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link to="/" className="btn btn-primary">
            Zur Startseite
          </Link>
          <a
            href="mailto:Admin@HD1920x1080.de?subject=404%20Anfrage"
            className="btn btn-secondary"
          >
            Kontakt
          </a>
        </div>
      </div>
    </main>
  )
}

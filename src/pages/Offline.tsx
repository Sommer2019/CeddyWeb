import React from 'react'
import { Link } from 'react-router-dom'

export default function Offline(): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 140px)',
        padding: 24,
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 520,
          padding: 18,
          borderRadius: 12,
          background:
            'linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(0, 0, 0, 0.12))',
          textAlign: 'center',
        }}
      >
        <h1>Offline</h1>
        <p>
          Die Seite ist momentan offline. Versuche es später erneut oder öffne
          den Stream/Chat im neuen Tab:
        </p>
        <a
          className="link-card"
          href="https://www.twitch.tv/hd1920x1080"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 16,
            padding: 16,
            borderRadius: 12,
            background: 'var(--card-bg)',
            border: '1px solid var(--box-border)',
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          <svg
            className="icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1000 1139.412"
            role="img"
            aria-label="Twitch"
            style={{ width: 48, height: 48 }}
          >
            <title>Twitch</title>
            <g transform="matrix(1.25,0,0,-1.25,-779.56837,2089.8162)">
              <g transform="matrix(9.5324427,0,0,9.5324427,1348.9493,1188.2344)">
                <path
                  d="m 0,0 -13.652,-13.651 -21.445,0 -11.699,-11.697 0,11.697 -17.548,0 0,56.544 L 0,42.893 0,0 z m -72.146,50.692 -3.899,-15.599 0,-70.19 17.55,0 0,-9.751 9.746,0 9.752,9.751 15.596,0 31.196,31.192 0,54.597 -79.941,0 z"
                  fill="#6441a5"
                />
              </g>
              <path
                d="m 940.03601,1225.3756 74.34349,0 0,223.0687 -74.34349,0 0,-223.0687 z m 204.43279,0 74.3435,0 0,223.0687 -74.3435,0 0,-223.0687 z"
                fill="#6441a5"
              />
            </g>
          </svg>
          <div className="card-text">
            <strong>Twitch-Channel öffnen</strong>
          </div>
        </a>
      </div>
    </div>
  )
}

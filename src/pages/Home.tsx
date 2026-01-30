import React from 'react'

export default function Home(): JSX.Element {
  return (
    <div style={{padding: '2rem'}}>
      <h1>HD - Startseite (SPA)</h1>
      <p>Diese SPA lädt die vorhandenen Seiten als Legacy-Inhalte. Wähle eine Seite oben.</p>
      <section>
        <h2>Schnellzugriff</h2>
        <ul>
          <li><a href="/games/bartclicker.html" target="_blank" rel="noreferrer">Bartclicker (Legacy-Seite, neues Tab)</a></li>
          <li><a href="/clipdesmonats.html">Clip des Monats</a></li>
          <li><a href="/streamplan.html">Streamplan</a></li>
        </ul>
      </section>
    </div>
  )
}


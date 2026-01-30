import React from 'react'

export default function ClipDesJahres(): JSX.Element {
  return (
    <div style={{padding: '1rem'}}>
      <h1>Clip des Jahres</h1>
      <iframe src="/clipdesjahres.html" title="Clip des Jahres" style={{width: '100%', height: '80vh', border: 'none'}} />
    </div>
  )
}


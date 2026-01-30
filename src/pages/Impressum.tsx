import React from 'react'

export default function Impressum(): JSX.Element {
  return (
    <div style={{padding: '1rem'}}>
      <h1>Impressum</h1>
      <iframe src="/impressum.html" title="Impressum" style={{width: '100%', height: '80vh', border: 'none'}} />
    </div>
  )
}


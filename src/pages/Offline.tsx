import React from 'react'

export default function Offline(): JSX.Element {
  return (
    <div style={{padding: '1rem'}}>
      <h1>Offline</h1>
      <iframe src="/offline.html" title="Offline" style={{width: '100%', height: '80vh', border: 'none'}} />
    </div>
  )
}


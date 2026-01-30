import React from 'react'

export default function ClipDesMonats() {
  return (
    <div style={{padding: '1rem'}}>
      <h1>Clip des Monats</h1>
      <iframe src="/clipdesmonats.html" title="Clip des Monats" style={{width: '100%', height: '80vh', border: 'none'}} />
    </div>
  )
}

export { default } from './ClipDesMonats.tsx'

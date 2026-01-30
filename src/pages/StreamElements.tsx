import React from 'react'

export default function StreamElements(): JSX.Element {
  return (
    <div style={{padding: '1rem'}}>
      <h1>StreamElements</h1>
      <iframe src="/streamelements.html" title="StreamElements" style={{width: '100%', height: '80vh', border: 'none'}} />
    </div>
  )
}


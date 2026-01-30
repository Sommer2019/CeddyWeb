import React from 'react'

export default function StreamPlan() {
  return (
    <div style={{padding: '1rem'}}>
      <h1>Streamplan</h1>
      <iframe src="/streamplan.html" title="Streamplan" style={{width: '100%', height: '80vh', border: 'none'}} />
    </div>
  )
}

export { default } from './StreamPlan.tsx'

import React, { useEffect } from 'react'

export default function BartClicker(): JSX.Element {
  useEffect(() => {
    document.title = 'BartClicker - HD'
  }, [])

  return (
    <div style={{padding: '1rem'}}>
      <h1>BartClicker (Legacy in iframe)</h1>
      <div style={{width: '100%', height: '80vh', border: '1px solid #333'}}>
        <iframe src="/games/bartclicker.html" title="BartClicker" style={{width: '100%', height: '100%', border: 'none'}} />
      </div>
      <p>Bitte teste die Interaktion im eingebetteten Frame. Später kann diese Seite zu nativer React-Implementierung umgewandelt werden.</p>
    </div>
  )
}


import React from 'react'

export default function OBMedia(): JSX.Element {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 120px)', minHeight: 500 }}>
      <iframe
        src="/ob/media.html"
        title="OnlyBart Media"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  )
}

import React from 'react'

export default function OBPhotos(): JSX.Element {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 120px)', minHeight: 500 }}>
      <iframe
        src="/ob/photos.html"
        title="OnlyBart Photos"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  )
}

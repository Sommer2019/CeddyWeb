import React from 'react'

export default function OBVideos(): JSX.Element {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 120px)', minHeight: 500 }}>
      <iframe
        src="/ob/videos.html"
        title="OnlyBart Videos"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  )
}

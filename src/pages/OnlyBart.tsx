import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function OnlyBart(): JSX.Element {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => navigate('/ob/posts', { replace: true }), 1000)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
      }}
    >
      <img
        id="logo"
        src="/img/OnlyBart.png"
        alt="OnlyBart Logo"
        style={{
          width: 220,
          height: 'auto',
          animation: 'grow 1s ease forwards',
        }}
      />
      <style>{`
        @keyframes grow {
          from { transform: scale(1); }
          to { transform: scale(2); }
        }
      `}</style>
    </div>
  )
}

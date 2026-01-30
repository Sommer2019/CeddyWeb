import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem('cookie_accepted')
    if (!accepted) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('cookie_accepted', '1')
    setVisible(false)
  }

  function reject() {
    localStorage.setItem('cookie_accepted', '0')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-banner show" role="dialog" aria-live="polite">
      <div className="cookie-banner-content">
        <div className="cookie-banner-text">
          Diese Website verwendet Cookies, um das Nutzererlebnis zu verbessern. Mehr dazu in unserer{' '}
          <Link to="/datenschutz">Datenschutzerklärung</Link>.
        </div>
        <div className="cookie-banner-buttons">
          <button type="button" className="btn btn-accept" onClick={accept}>
            Akzeptieren
          </button>
          <button type="button" className="btn btn-reject" onClick={reject}>
            Ablehnen
          </button>
        </div>
      </div>
    </div>
  )
}

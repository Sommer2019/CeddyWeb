import React, { useEffect, useState } from 'react'

export default function CookieBanner(){
  const [visible, setVisible] = useState(false)

  useEffect(()=>{
    const accepted = localStorage.getItem('cookie_accepted')
    if(!accepted) setVisible(true)
  },[])

  function accept(){
    localStorage.setItem('cookie_accepted','1')
    setVisible(false)
  }

  if(!visible) return null

  return (
    <div className={`cookie-banner show`} role="dialog" aria-live="polite">
      <div className="cookie-banner-content">
        <div className="cookie-banner-text">
          Diese Website verwendet Cookies, um das Nutzererlebnis zu verbessern. Mehr dazu in unserer <a href="/datenschutz">Datenschutzerklärung</a>.
        </div>
        <div className="cookie-banner-buttons">
          <button className="btn btn-accept" onClick={accept}>Akzeptieren</button>
        </div>
      </div>
    </div>
  )
}


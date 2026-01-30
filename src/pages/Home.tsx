import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'

const TWITCH_CHANNEL = 'hd1920x1080'
const RESOURCE_PACK_URL = 'https://github.com/HD1920x1080Media/Minecraft-Ressource-Pack/archive/refs/tags/latest.zip'

function getTwitchParent(): string {
  if (typeof window === 'undefined') return 'hd1920x1080.de'
  return window.location.hostname || 'hd1920x1080.de'
}

export default function Home(): JSX.Element {
  const [mobileView, setMobileView] = useState<'live' | 'links' | 'games'>('live')
  const [downloadModalOpen, setDownloadModalOpen] = useState(false)
  const [pendingDownloadUrl, setPendingDownloadUrl] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches
  const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 720px)') : null

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem('mobileView') as 'live' | 'links' | 'games' | null
      if (saved && (saved === 'live' || saved === 'links' || saved === 'games')) setMobileView(saved)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!mq) return
    const apply = () => {
      if (!mq.matches) {
        document.body.classList.remove('mobile-live', 'mobile-links', 'mobile-games')
        return
      }
      document.body.classList.remove('mobile-live', 'mobile-links', 'mobile-games')
      document.body.classList.add(`mobile-${mobileView}`)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [mq, mobileView])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!mq?.matches) return
    document.body.classList.remove('mobile-live', 'mobile-links', 'mobile-games')
    document.body.classList.add(`mobile-${mobileView}`)
    try {
      localStorage.setItem('mobileView', mobileView)
    } catch {
      // ignore
    }
  }, [mobileView, mq])

  const copyDiscountCode = useCallback((code: string) => {
    const doCopy = (text: string) => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => setToast(`Rabattcode kopiert: ${code}`)).catch(() => { doFallback(text) })
      } else doFallback(text)
    }
    const doFallback = (text: string) => {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* ignore */ }
      document.body.removeChild(ta)
      setToast(`Rabattcode kopiert: ${code}`)
    }
    doCopy(code)
  }, [])

  const showDownloadConfirm = useCallback((url: string) => {
    setPendingDownloadUrl(url)
    setDownloadModalOpen(true)
  }, [])

  const hideDownloadConfirm = useCallback(() => {
    setDownloadModalOpen(false)
    setPendingDownloadUrl(null)
  }, [])

  const confirmDownload = useCallback(() => {
    const url = pendingDownloadUrl
    hideDownloadConfirm()
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = 'HD1920x1080_V1.10.zip'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, [pendingDownloadUrl, hideDownloadConfirm])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const parent = getTwitchParent()
  const playerSrc = `https://player.twitch.tv/?channel=${encodeURIComponent(TWITCH_CHANNEL)}&parent=${encodeURIComponent(parent)}&muted=true`
  const chatSrc = `https://www.twitch.tv/embed/${encodeURIComponent(TWITCH_CHANNEL)}/chat?parent=${encodeURIComponent(parent)}&darkpopout`

  return (
    <>
      <header id="hero" className="hero fullwidth">
        <div className="hero-overlay fullwidth">
          <div className="container">
            <div className="profile-box">
              <img src="/img/Logos/HDProfile.webp" alt="HD Profilbild" className="profile-img" />
              <div className="profile-info">
                <h1>HD1920x1080</h1>
                <p>FullHD - Gaming, Streams & Clips</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        <div className="mobile-toggle" role="tablist" aria-label="Ansicht wechseln">
          <button
            type="button"
            className={mobileView === 'live' ? 'active' : ''}
            role="tab"
            aria-controls="live-section"
            aria-selected={mobileView === 'live'}
            onClick={() => setMobileView('live')}
          >
            Live
          </button>
          <button
            type="button"
            className={mobileView === 'links' ? 'active' : ''}
            role="tab"
            aria-controls="links-section"
            aria-selected={mobileView === 'links'}
            onClick={() => setMobileView('links')}
          >
            Links
          </button>
          <button
            type="button"
            className={mobileView === 'games' ? 'active' : ''}
            role="tab"
            aria-controls="games-section"
            aria-selected={mobileView === 'games'}
            onClick={() => setMobileView('games')}
          >
            Games
          </button>
        </div>

        <section id="live-section" className="embed-section" aria-label="Live Streams und Kalender">
          <div className="embed-wrapper">
            <div className="embed-card fullwidth">
              <a href="https://www.twitch.tv/hd1920x1080" target="_blank" rel="noopener noreferrer">
                <div className="embed-title">Live</div>
              </a>
              <div className="responsive-embed-row" style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
                <div className="responsive-embed player" style={{ flex: '1 1 0' }}>
                  <iframe
                    className="twitch-player-iframe"
                    src={playerSrc}
                    allow="autoplay; fullscreen; clipboard-write; encrypted-media"
                    allowFullScreen
                    title="Twitch Live Player"
                    style={{ width: '100%', height: '100%', border: 0 }}
                  />
                </div>
                <div className="responsive-embed chat" style={{ flex: '0 0 220px', maxWidth: 420 }}>
                  <iframe
                    className="twitch-chat-iframe"
                    src={chatSrc}
                    title="Twitch Chat"
                    allow="autoplay; fullscreen; clipboard-write"
                    style={{ width: '100%', height: '100%', border: 0 }}
                  />
                  <div style={{ marginTop: '.5rem', fontSize: '.9rem' }}>
                    <a href="https://www.twitch.tv/hd1920x1080/chat" target="_blank" rel="noopener noreferrer">
                      Chat im neuen Tab öffnen
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div id="donation-embed" className="embed-card fullwidth" aria-live="polite" aria-atomic="true" style={{ display: 'none' }}>
              <div className="loading">Lade Spenden-Übersicht…</div>
            </div>
          </div>
        </section>

        <section id="links-section" className="links-box" aria-label="Wichtige Links">
          <div className="link-grid">
            <Link to="/streamplan" className="link-card streamplan" rel="noopener noreferrer">
              <img src="/img/Logos/StreamPlan.webp" alt="Streamplan Icon" className="icon" />
              <div className="card-text">
                <strong>Streamplan</strong>
                <span>Live-Termine</span>
              </div>
            </Link>
            <Link to="/streamelements" className="link-card" rel="noopener noreferrer">
              <img src="/img/Logos/StreamElements.png" alt="StreamElements" className="icon" />
              <div className="card-text">
                <strong>StreamElements</strong>
                <span>Donation + Liste</span>
              </div>
            </Link>
            <Link to="/clipdesmonats" className="link-card" target="_self" rel="noopener">
              <img src="/img/Logos/cdm.png" alt="Clip des Monats" className="icon" />
              <div className="card-text">
                <strong>Clip des Monats</strong>
                <span>Votet für die Top 10 Clips des letzten Monats</span>
              </div>
            </Link>
            <a className="link-card" href="https://youtube.com/@hawedereplus" target="_blank" rel="noopener noreferrer">
              <img src="/img/Logos/youtube.svg" alt="YouTube" className="icon" />
              <div className="card-text">
                <strong>YouTube</strong>
                <span>Hauptkanal</span>
              </div>
            </a>
            <a className="link-card" href="https://tiktok.com/@hd1920x1080" target="_blank" rel="noopener noreferrer">
              <img src="/img/Logos/tiktok.svg" alt="TikTok" className="icon" />
              <div className="card-text">
                <strong>TikTok</strong>
                <span>Hauptkanal</span>
              </div>
            </a>
            <a className="link-card" href="https://www.instagram.com/hd1920x1080/" target="_blank" rel="noopener noreferrer">
              <img src="/img/Logos/instagram.svg" alt="Instagram" className="icon" />
              <div className="card-text">
                <strong>Instagram</strong>
                <span>Hauptkanal</span>
              </div>
            </a>
            <a className="link-card" href="https://discord.gg/Zp5KNqCHzc" target="_blank" rel="noopener noreferrer">
              <img src="/img/Logos/discord.svg" alt="Discord" className="icon" />
              <div className="card-text">
                <strong>Discord</strong>
                <span>Server beitreten</span>
              </div>
            </a>
            <a className="link-card" href="mailto:Admin@HD1920x1080.de?subject=Kontaktanfrage" target="_self" rel="noopener">
              <img src="/img/Logos/email.svg" alt="E-Mail" className="icon" />
              <div className="card-text">
                <strong>Kontakt</strong>
                <span>Kontakt per E‑Mail</span>
              </div>
            </a>
            <Link to="/ob" className="link-card" target="_self" rel="noopener">
              <img src="/img/Logos/OB.png" alt="OnlyBart" className="icon" />
              <div className="card-text">
                <strong>OnlyBart</strong>
                <span>Ganz viel Bart :)</span>
              </div>
            </Link>
          </div>
        </section>

        <section id="games-section" className="games-section" aria-label="Game-Related Links">
          <h2 className="section-title">Game-Related Links</h2>
          <div className="clips-grid">
            <a className="link-card" href="http://tng.gl/c/hd1920x1080" target="_blank" rel="noopener noreferrer">
              <img src="/img/Logos/Puzzle.svg" alt="Puzzle" className="icon" />
              <div className="card-text">
                <strong>Tanggle.io</strong>
                <span>Live mitpuzzeln</span>
              </div>
            </a>
            <button
              type="button"
              className="link-card"
              style={{ background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01))', border: '1px solid rgba(124, 77, 255, 0.06)', cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }}
              onClick={() => showDownloadConfirm(RESOURCE_PACK_URL)}
            >
              <img src="/img/Logos/MinecraftRessourcePack.webp" alt="Ressource Pack" className="icon" />
              <div className="card-text">
                <strong>Minecraft ResourcePack</strong>
                <span>Download</span>
              </div>
            </button>
            <Link to="/bartclicker" className="link-card" rel="noopener noreferrer">
              <svg viewBox="25 15 75 75" width={48} height={48} preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
                <rect x="30" y="30" width="40" height="40" rx="6" fill="#d4a373" />
                <g>
                  <rect x="25" y="32" width="50" height="5" rx="2" fill="#7C4DFF" />
                  <path d="M30 32 L70 32 L70 25 Q 50 15 30 25 Z" fill="#7C4DFF" />
                  <circle cx="50" cy="18" r="2" fill="#5c38cc" />
                </g>
                <g stroke="#111" strokeWidth="1.2" fill="none">
                  <rect x="34" y="42" width="10" height="7" rx="1" />
                  <rect x="56" y="42" width="10" height="7" rx="1" />
                  <path d="M44 46 h12" />
                </g>
                <circle cx="39" cy="45" r="1" fill="#000" />
                <circle cx="61" cy="45" r="1" fill="#000" />
                <path d="M 30 60 Q 50 63 70 60 L 70 76.26 Q 50 89.89 30 76.26 Z" fill="#3d2b1f" />
              </svg>
              <div className="card-text">
                <strong>Bartclicker</strong>
                <span>Bartclicker spielen</span>
              </div>
            </Link>
          </div>
        </section>

        <section className="clips-section" aria-label="Clips und Shorts">
          <h2 className="section-title">Clips & Shorts</h2>
          <div className="clips-grid">
            <a className="link-card" href="https://www.youtube.com/@lesommer2019" target="_blank" rel="noopener noreferrer">
              <img src="/img/Logos/youtube.svg" alt="YouTube Shorts" className="icon" />
              <div className="card-text">
                <strong>YT Shorts</strong>
                <span>Shorts & Clips</span>
              </div>
            </a>
            <a className="link-card" href="https://www.tiktok.com/@hawedereshorts" target="_blank" rel="noopener noreferrer">
              <img src="/img/Logos/tiktok.svg" alt="TikTok Clips" className="icon" />
              <div className="card-text">
                <strong>TikTok Clips</strong>
                <span>Shorts & Clips</span>
              </div>
            </a>
            <a className="link-card" href="https://www.instagram.com/hawedereshorts/" target="_blank" rel="noopener noreferrer">
              <img src="/img/Logos/instagram.svg" alt="Instagram Clips" className="icon" />
              <div className="card-text">
                <strong>Insta Clips</strong>
                <span>Shorts & Clips</span>
              </div>
            </a>
          </div>
        </section>

        <section className="clips-section" aria-label="Partner">
          <h2 className="section-title">Partner</h2>
          <div className="clips-grid">
            <a
              className="link-card"
              href="https://yvolve.shop/?bg_ref=cnbZIhbZxH"
              target="_blank"
              rel="noopener noreferrer"
              data-code="FullHD"
              onClick={(e) => { copyDiscountCode('FullHD'); e.preventDefault(); (e.currentTarget as HTMLAnchorElement).href = 'https://yvolve.shop/?bg_ref=cnbZIhbZxH'; }}
            >
              <img src="/img/Logos/Evolve.png" alt="Evolve" className="icon" />
              <div className="card-text">
                <strong>Yvolve</strong>
                <span>Code: FullHD</span>
                <span>10% Rabatt auf die gesamte Bestellung</span>
              </div>
            </a>
            <a className="link-card" href="https://nclip.io/page/hd1920x1080" target="_blank" rel="noopener noreferrer">
              <img src="/img/Logos/NClip.png" alt="NClip" className="icon" />
              <div className="card-text">
                <strong>NClip</strong>
              </div>
            </a>
            <a
              className="link-card"
              href="https://frugends.com/?srsltid=AfmBOoqjyBjbK5TWs0tAS4ELgV93XqTXzl84OChVKd93OVkjeWfH8wFT"
              target="_blank"
              rel="noopener noreferrer"
              data-code="FullHD"
              onClick={(e) => { copyDiscountCode('FullHD'); }}
            >
              <img src="/img/Logos/Frugends.png" alt="Frugends" className="icon" />
              <div className="card-text">
                <strong>Frugends</strong>
                <span>Code: FullHD</span>
              </div>
            </a>
          </div>
        </section>

        <footer className="footer">
          <p>© {new Date().getFullYear()} FullHD Media <Link to="/impressum">Impressum</Link> | <Link to="/datenschutz">Datenschutz</Link></p>
        </footer>
      </main>

      {/* Download-Modal */}
      <div className={`download-modal${downloadModalOpen ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-hidden={!downloadModalOpen}>
        <div className="modal-backdrop" onClick={hideDownloadConfirm} aria-hidden="true" />
        <div className="modal-card" role="document">
          <h3 className="modal-title">Download bestätigen</h3>
          <p className="modal-message">
            Möchtest du das Resource-Pack herunterladen: <strong>HD1920x1080_V1.10.zip</strong>?
          </p>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={hideDownloadConfirm}>Abbrechen</button>
            <button type="button" className="btn btn-primary" onClick={confirmDownload}>Herunterladen</button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            right: '1rem',
            bottom: '1rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            borderRadius: '6px',
            zIndex: 9999,
            fontSize: '0.9rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            transition: 'opacity 0.3s ease',
          }}
        >
          {toast}
        </div>
      )}
    </>
  )
}

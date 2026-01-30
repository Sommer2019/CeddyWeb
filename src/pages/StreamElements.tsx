import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface Trigger {
  text: string
  priceBadge: string
  triggerDesc: string
  audio?: string
}

const TRIGGERS: Trigger[] = [
  {
    text: 'Taschengeld Donation Sounds wird abgespielt (Danke von den Kids) 🎉',
    priceBadge: '1€ - 1,19€',
    triggerDesc: 'Taschengeld',
  },
  {
    text: 'Text to Speech wird abgespielt 🔊',
    priceBadge: 'ab 1,20€',
    triggerDesc: 'TTS',
  },
  {
    text: 'Knock Knock wird abgespielt 🚪',
    priceBadge: '4,20€',
    triggerDesc: 'KnockKnock',
    audio: '/audio/knock.mp3',
  },
  {
    text: 'Major Tom wird abgespielt 🧑🏼‍🚀',
    priceBadge: '5,00€',
    triggerDesc: 'Major Tom',
    audio: '/audio/MajorTom.mp3',
  },
  {
    text: 'Scream wird abgespielt 😱',
    priceBadge: '6,66€',
    triggerDesc: 'Scream',
    audio: '/audio/scream.mp3',
  },
  {
    text: 'nervige Fliege wird abgespielt 🪰',
    priceBadge: '7,77€',
    triggerDesc: 'nervige Fliege (60 Sekunden)',
    audio: '/audio/Fliege1.mp3',
  },
  {
    text: 'Stefan isst einen CenterShock & Sound wird abgespielt 🍋',
    priceBadge: '9,20€',
    triggerDesc: 'Sauer macht Lustig - CenterShock',
    audio: '/audio/CenterShock.mp3',
  },
  {
    text: 'Youtube Mitglieder Sound wird abgespielt 🪩',
    priceBadge: '10,80€',
    triggerDesc: 'Youtube Mitglieder Sound',
    audio: '/audio/1080.mp3',
  },
  {
    text: 'sehr nervige Fliege wird abgespielt 🪰',
    priceBadge: '14,44€',
    triggerDesc: 'Fliege XXL — 2 Minuten',
    audio: '/audio/Fliege2.mp3',
  },
  {
    text: '1920 wird abgespielt ⁉️',
    priceBadge: '19,20€',
    triggerDesc: '1920',
    audio: '/audio/1920.mp3',
  },
  {
    text: 'ultra nervige Fliege wird abgespielt 🪰',
    priceBadge: '19,66€',
    triggerDesc: 'Fliege ultra lang',
    audio: '/audio/Fliege3.mp3',
  },
  {
    text: 'Stefan zündet eine Konfettikanone 🎉',
    priceBadge: '22,22€',
    triggerDesc: 'Konfettikanone (nur wenn verfügbar)',
  },
  {
    text: 'Stefan isst 8 Hot Nuts & Sound wird abgespielt 🔥',
    priceBadge: '25,00€',
    triggerDesc: '8 Hot Nuts + FIRE!!! (nur wenn verfügbar)',
    audio: '/audio/FIRE.mp3',
  },
  {
    text: 'Stefan isst ein sartanisches Sandwich (Oreo + Hotnuts + Centershock) & Sound wird abgespielt 🔥',
    priceBadge: 'x66,66€',
    triggerDesc: 'Satanisches Sandwich (nur wenn verfügbar)',
    audio: '/audio/Sandwich.mp3',
  },
]

const STREAMELEMENTS_TIP_URL =
  'https://streamelements.com/hd1920x1080-5003/tip'

export default function StreamElements(): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTrigger, setActiveTrigger] = useState<Trigger | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const openModal = useCallback((trigger: Trigger) => {
    setActiveTrigger(trigger)
    setModalOpen(true)
  }, [])

  useEffect(() => {
    if (!modalOpen || !activeTrigger?.audio || !audioRef.current) return
    const el = audioRef.current
    el.src = activeTrigger.audio
    el.load()
    el.play().catch(() => {})
    return () => {
      el.pause()
      el.currentTime = 0
    }
  }, [modalOpen, activeTrigger?.audio])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setActiveTrigger(null)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [])

  return (
    <main className="container">
      <div>
        <h1 className="page-title">Donations</h1>
        <p>
          Hier findest du die Donation-Trigger und Sounds von HD1920x1080.
          Klicke auf einen Trigger für eine Vorschau.
        </p>
        <div className="embed-card fullwidth">
          <ul className="triggers-list">
            {TRIGGERS.map((trigger, i) => (
              <li
                key={i}
                onClick={() => openModal(trigger)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openModal(trigger)
                  }
                }}
                role="button"
                tabIndex={0}
                data-text={trigger.text}
              >
                <span className="price-badge">{trigger.priceBadge}</span>
                <span className="trigger-desc">{trigger.triggerDesc}</span>
              </li>
            ))}
          </ul>
          <a
            className="link-card"
            href={STREAMELEMENTS_TIP_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/img/Logos/StreamElements.png"
              alt="StreamElements"
              className="icon"
            />
            <div className="card-text">
              <strong>StreamElements</strong>
              <span>Donation</span>
            </div>
          </a>
          <p style={{ marginTop: 18 }}>
            <Link to="/" className="btn">
              ← Zurück
            </Link>
          </p>
        </div>
      </div>

      <div
        className="modal"
        style={{ display: modalOpen ? 'flex' : 'none' }}
        onClick={(e) => e.target === e.currentTarget && closeModal()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="donation-modal-header"
      >
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2 id="donation-modal-header">
            {activeTrigger?.triggerDesc ?? activeTrigger?.text}
          </h2>
          {activeTrigger && <p>{activeTrigger.text}</p>}
          {activeTrigger?.audio && (
            <audio
              ref={audioRef}
              controls
              preload="none"
              src={activeTrigger.audio}
              style={{ display: 'block', width: '100%', margin: '15px 0' }}
            />
          )}
          <div className="modal-buttons">
            <button
              type="button"
              className="btn close-btn"
              onClick={closeModal}
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

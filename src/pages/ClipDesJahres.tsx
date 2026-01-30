import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import {
  type Clip,
  type ClipsData,
  type CdjVotingConfig,
  fetchClipsFromDB,
  getClipDesJahresVotingConfig,
  fetchClipDesJahresWinner,
  fetchClipDesJahresPeriod,
  submitVoteToDB,
  getUserIpHash,
  formatDate,
  canEmbedClip,
  getEmbedUrl,
} from '../lib/votingApi'

const VOTE_STORAGE_KEY_CDJ = 'cdj_voted_clip'

type View =
  | 'loading'
  | 'voting'
  | 'voted'
  | 'winner'
  | 'by-month'
  | 'no-clips'
  | 'error'

interface CdjClip extends Record<string, unknown> {
  clip_id: string
  title: string
  thumbnail_url: string
  url: string
  view_count: number
  duration: number
  created_at: string
  creator_name: string
  votes: number
  month?: number
}

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

export default function ClipDesJahres(): JSX.Element {
  const [view, setView] = useState<View>('loading')
  const [allowLocalEmbeds, setAllowLocalEmbeds] = useState(false)
  const [cdjConfig, setCdjConfig] = useState<CdjVotingConfig | null>(null)
  const [isCdjVoting, setIsCdjVoting] = useState(false)
  const [clipsData, setClipsData] = useState<ClipsData | null>(null)
  const [votedClipId, setVotedClipId] = useState<string | null>(null)
  const [winner, setWinner] = useState<CdjClip | null>(null)
  const [clipsByMonth, setClipsByMonth] = useState<Record<number, CdjClip[]>>({})
  const [cdjYear, setCdjYear] = useState(new Date().getFullYear())
  const [errorMessage, setErrorMessage] = useState('')
  const [voteModalClipId, setVoteModalClipId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const init = useCallback(async () => {
    try {
      setView('loading')
      setErrorMessage('')
      setClipsData(null)
      setVotedClipId(null)
      setWinner(null)
      setClipsByMonth({})

      try {
        const configRes = await fetch('/votingData/config.json')
        if (configRes.ok) {
          const config = await configRes.json()
          setAllowLocalEmbeds(Boolean(config.allowLocalEmbeds))
        }
      } catch {
        // ignore
      }

      const now = new Date()
      const currentYear = now.getFullYear()

      let cdjActive = false
      let config: CdjVotingConfig | null = null
      try {
        config = await getClipDesJahresVotingConfig()
        if (config?.is_active && now <= new Date(config.ends_at)) {
          cdjActive = true
        }
      } catch {
        // ignore
      }
      setCdjConfig(config)
      setIsCdjVoting(cdjActive)

      if (cdjActive) {
        const data = await fetchClipsFromDB()
        setClipsData(data)
        if (!data.clips?.length) {
          setView('error')
          setErrorMessage('Keine Clips für das Voting verfügbar.')
          return
        }

        const stored = localStorage.getItem(VOTE_STORAGE_KEY_CDJ)
        let alreadyVoted: string | null = stored
        if (!alreadyVoted) {
          try {
            const ipHash = await getUserIpHash()
            const supabase = getSupabase()
            const { data: existing } = await supabase
              .from('votes')
              .select('clip_id')
              .eq('ip_hash', ipHash)
              .eq('voting_round', 'cdj')
              .single()
            if (existing?.clip_id) alreadyVoted = String(existing.clip_id)
          } catch {
            // ignore
          }
        }
        if (alreadyVoted) {
          setVotedClipId(alreadyVoted)
          setView('voted')
          return
        }
        setView('voting')
        return
      }

      const previousYear = currentYear - 1
      let winnerData = null
      try {
        winnerData = await fetchClipDesJahresWinner(previousYear)
      } catch {
        // ignore
      }

      if (winnerData && typeof winnerData === 'object') {
        setWinner(winnerData as CdjClip)
        setView('winner')
        return
      }

      const periodClips = await fetchClipDesJahresPeriod(currentYear)
      if (!periodClips?.length) {
        setView('no-clips')
        return
      }

      const byMonth: Record<number, CdjClip[]> = {}
      periodClips.forEach((c) => {
        const clip = c as CdjClip
        const month = clip.month ?? 12
        if (!byMonth[month]) byMonth[month] = []
        byMonth[month].push(clip)
      })
      setClipsByMonth(byMonth)
      setCdjYear(currentYear)
      setView('by-month')
    } catch (err) {
      console.error(err)
      setView('error')
      setErrorMessage(
        err instanceof Error ? err.message : 'Fehler beim Laden der Clip des Jahres Daten.'
      )
    }
  }, [])

  useEffect(() => {
    init()
  }, [init])

  const handleConfirmVote = useCallback(async () => {
    const clipId = voteModalClipId
    setVoteModalClipId(null)
    if (!clipId) return
    setSubmitting(true)
    try {
      const ipHash = await getUserIpHash()
      await submitVoteToDB(clipId, ipHash, 'cdj')
      localStorage.setItem(VOTE_STORAGE_KEY_CDJ, clipId)
      setVotedClipId(clipId)
      setView('voted')
    } catch (err) {
      if (err instanceof Error && err.message === 'Already voted') {
        localStorage.setItem(VOTE_STORAGE_KEY_CDJ, clipId)
        setVotedClipId(clipId)
        setView('voted')
      } else {
        setErrorMessage('Fehler beim Abstimmen.')
      }
    } finally {
      setSubmitting(false)
    }
  }, [voteModalClipId])

  const renderClipCard = (
    clip: Clip | CdjClip,
    options: { showVoteButton?: boolean; isVoted?: boolean; showVotes?: boolean } = {}
  ) => {
    const c = clip as Clip
    const votes = 'votes' in clip ? (clip as CdjClip).votes : 0
    const canEmbed = canEmbedClip(allowLocalEmbeds)
    return (
      <div
        key={c.id}
        className={`clip-card${options.isVoted ? ' voted-clip' : ''}`}
      >
        <div
          className="clip-embed-wrapper"
          style={{ width: '100%', height: 360, marginBottom: 8 }}
        >
          {canEmbed ? (
            <iframe
              src={getEmbedUrl(c.id)}
              title={c.title}
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <img
              src={c.thumbnail_url}
              alt={c.title}
              className="clip-thumbnail"
              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
              onClick={() => window.open(c.url, '_blank')}
            />
          )}
        </div>
        <div className="clip-info">
          <h3 className="clip-title">{c.title}</h3>
          {options.showVotes && (
            <div className="clip-votes">
              <strong>🗳️ {votes ?? 0} Stimmen</strong>
            </div>
          )}
          <div className="clip-meta">
            <span>👁️ {c.view_count.toLocaleString()} Views</span>
            <span>⏱️ {Math.floor(c.duration)}s</span>
            <span>📅 {formatDate(new Date(c.created_at))}</span>
          </div>
          <div className="clip-creator">Erstellt von: {c.creator_name}</div>
          {options.showVoteButton && (
            <button
              type="button"
              className="btn btn-primary vote-btn"
              onClick={() => setVoteModalClipId(c.id)}
            >
              Für diesen Clip voten
            </button>
          )}
          {options.isVoted && (
            <div className="your-vote-badge">✓ Deine Stimme</div>
          )}
        </div>
      </div>
    )
  }

  const monthOrder = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

  return (
    <main className="container">
      <div>
        <h1 className="page-title">Clip des Jahres</h1>
        <p>
          Hier kannst du für die Top 10 Clips des vergangenen Jahres stimmen /
          die Ergebnisse einsehen.
        </p>
        <p style={{ marginBottom: 18 }}>
          <Link to="/clipdesmonats" className="btn">
            → Zum Clip des Monats
          </Link>
        </p>

        <div className="voting-container">
          {view === 'loading' && (
            <div className="loading-message">Lade …</div>
          )}
          {view === 'error' && (
            <div className="error-message">
              <h2>⚠️ Fehler</h2>
              <p>{errorMessage}</p>
            </div>
          )}
          {view === 'voting' && clipsData && cdjConfig && (
            <>
              <div className="voting-header">
                <h2>🏆 Clip des Jahres {cdjConfig.target_year ?? new Date().getFullYear()} – Voting ist aktiv!</h2>
                <p>
                  Voting-Zeitraum: {formatDate(new Date(cdjConfig.started_at))} -{' '}
                  {formatDate(new Date(cdjConfig.ends_at))}
                </p>
                <p>Stimme für deinen Lieblings-Clip des Jahres!</p>
                <p>Du kannst für genau einen Clip abstimmen.</p>
                <p><strong>{clipsData.clips.length} Clips</strong> stehen zur Auswahl.</p>
              </div>
              <div className="clips-grid">
                {clipsData.clips.map((clip) =>
                  renderClipCard(clip, { showVoteButton: true })
                )}
              </div>
            </>
          )}
          {view === 'voted' && clipsData && votedClipId && (
            <>
              <div className="voted-message">
                <h2>✅ Vielen Dank für deine Stimme!</h2>
                <p>Du hast erfolgreich für den Clip des Jahres abgestimmt.</p>
                <p className="note">Du hast bereits abgestimmt und kannst nicht erneut voten.</p>
              </div>
              <div className="voted-clips-section">
                <h3>Alle Clips dieser Voting-Runde:</h3>
                <div className="clips-grid">
                  {clipsData.clips.map((clip) =>
                    renderClipCard(clip, {
                      isVoted: String(clip.id) === votedClipId,
                    })
                  )}
                </div>
              </div>
            </>
          )}
          {view === 'winner' && winner && (
            <>
              <p style={{ marginBottom: 16 }}>
                Der Gewinner des Clip des Jahres {new Date().getFullYear() - 1}:
              </p>
              <div className="results-header">
                <h2>🏆 Clip des Jahres {new Date().getFullYear() - 1}</h2>
                <p>
                  Mit <strong>{(winner as CdjClip).votes ?? 0} Stimmen</strong> hat dieser Clip gewonnen!
                </p>
              </div>
              <div className="results-grid" style={{ maxWidth: 800, margin: '0 auto' }}>
                {renderClipCard(
                  {
                    ...winner,
                    id: (winner as CdjClip).clip_id,
                    creator_name: (winner as CdjClip).creator_name,
                    view_count: (winner as CdjClip).view_count ?? 0,
                    duration: (winner as CdjClip).duration ?? 0,
                    created_at: (winner as CdjClip).created_at ?? '',
                    thumbnail_url: (winner as CdjClip).thumbnail_url,
                    title: (winner as CdjClip).title,
                    url: (winner as CdjClip).url,
                  } as Clip,
                  { showVotes: true }
                )}
              </div>
            </>
          )}
          {view === 'by-month' && (
            <>
              <p>Hier findest du die Top 10 Gewinner der zweiten Voting-Runde von Dezember bis November.</p>
              <div className="cdj-period-header" style={{ marginBottom: 24 }}>
                <p>Zeitraum: Dezember {cdjYear - 1} – November {cdjYear}</p>
              </div>
              {monthOrder.map((month) => {
                const list = clipsByMonth[month]
                if (!list?.length) return null
                const displayYear = month === 12 ? cdjYear - 1 : cdjYear
                const sorted = [...list].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0))
                const top10 = sorted.slice(0, 10)
                return (
                  <div key={month} className="cdj-month-section" style={{ marginBottom: 32 }}>
                    <h2 className="cdj-month-header">
                      🏆 {MONTH_NAMES[month - 1]} {displayYear}
                    </h2>
                    <div className="results-grid">
                      {top10.map((clip, idx) =>
                        renderClipCard(
                          {
                            ...clip,
                            id: clip.clip_id,
                            creator_name: clip.creator_name ?? '',
                            view_count: clip.view_count ?? 0,
                            duration: clip.duration ?? 0,
                            created_at: clip.created_at ?? '',
                          } as Clip,
                          { showVotes: true }
                        )
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}
          {view === 'no-clips' && (
            <div className="no-results-message">
              <h2>ℹ️ Noch keine Clip-des-Jahres-Daten</h2>
              <p>Für das aktuelle Jahr sind noch keine Gewinner verfügbar.</p>
            </div>
          )}
        </div>

        <div
          className={`download-modal${voteModalClipId ? ' is-open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-hidden={!voteModalClipId}
        >
          <div
            className="modal-backdrop"
            onClick={() => !submitting && setVoteModalClipId(null)}
            aria-hidden="true"
          />
          <div className="modal-card" role="document">
            <h3 className="modal-title">Vote bestätigen</h3>
            <p className="modal-message">
              Möchtest du wirklich für diesen Clip abstimmen?{' '}
              <strong>Du kannst nur einmal voten!</strong>
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => !submitting && setVoteModalClipId(null)}
                disabled={submitting}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmVote}
                disabled={submitting}
              >
                {submitting ? 'Wird gesendet…' : 'Abstimmen'}
              </button>
            </div>
          </div>
        </div>

        <p style={{ marginTop: 18 }}>
          <Link to="/" className="btn">
            ← Zurück
          </Link>
        </p>
      </div>
    </main>
  )
}

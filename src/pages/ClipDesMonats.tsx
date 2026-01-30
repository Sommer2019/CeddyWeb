import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import {
  type Clip,
  type ClipsData,
  type ResultsData,
  type SecondVotingConfig,
  fetchClipsFromDB,
  fetchResultsFromDB,
  getSecondVotingConfig,
  submitVoteToDB,
  getUserIpHash,
  formatDate,
  canEmbedClip,
  getEmbedUrl,
  getVotingPeriodOfMonth,
  isInVotingPeriod,
} from '../lib/votingApi'

const VOTE_STORAGE_KEY = 'cdm_voted_clip'
const VOTE_STORAGE_KEY_SECOND = 'cdm_voted_clip_second'

type View = 'loading' | 'voting' | 'voted' | 'results' | 'no-results' | 'error'

export default function ClipDesMonats(): JSX.Element {
  const [view, setView] = useState<View>('loading')
  const [allowLocalEmbeds, setAllowLocalEmbeds] = useState(false)
  const [secondVotingConfig, setSecondVotingConfig] = useState<SecondVotingConfig | null>(null)
  const [isSecondVoting, setIsSecondVoting] = useState(false)
  const [clipsData, setClipsData] = useState<ClipsData | null>(null)
  const [resultsData, setResultsData] = useState<ResultsData | null>(null)
  const [votedClipId, setVotedClipId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [voteModalClipId, setVoteModalClipId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const getStorageKey = () => (isSecondVoting ? VOTE_STORAGE_KEY_SECOND : VOTE_STORAGE_KEY)
  const getVotingRound = (): 'monthly' | 'second' => (isSecondVoting ? 'second' : 'monthly')

  const init = useCallback(async () => {
    try {
      setView('loading')
      setErrorMessage('')
      setClipsData(null)
      setResultsData(null)
      setVotedClipId(null)

      try {
        const configRes = await fetch('/votingData/config.json')
        if (configRes.ok) {
          const config = await configRes.json()
          setAllowLocalEmbeds(Boolean(config.allowLocalEmbeds))
        }
      } catch {
        // ignore
      }

      let secondActive = false
      let secConfig: SecondVotingConfig | null = null
      try {
        secConfig = await getSecondVotingConfig()
        if (secConfig?.is_active && new Date() <= new Date(secConfig.ends_at)) {
          secondActive = true
        }
      } catch {
        // ignore
      }
      setSecondVotingConfig(secConfig)
      setIsSecondVoting(secondActive)

      const votingActive = secondActive || isInVotingPeriod()
      const storageKey = secondActive ? VOTE_STORAGE_KEY_SECOND : VOTE_STORAGE_KEY
      const votingRound = secondActive ? 'second' : 'monthly'

      if (votingActive) {
        const data = await fetchClipsFromDB()
        setClipsData(data)
        if (!data.clips?.length) {
          setView('error')
          setErrorMessage('Keine Clips zum Voting verfügbar.')
          return
        }

        const stored = localStorage.getItem(storageKey)
        let alreadyVoted: string | null = stored
        if (!alreadyVoted) {
          try {
            const ipHash = await getUserIpHash()
            const supabase = getSupabase()
            const { data: existing } = await supabase
              .from('votes')
              .select('clip_id')
              .eq('ip_hash', ipHash)
              .eq('voting_round', votingRound)
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

      const results = await fetchResultsFromDB()
      if (results?.results?.length) {
        setResultsData(results)
        setView('results')
      } else {
        setView('no-results')
      }
    } catch (err) {
      console.error(err)
      setView('error')
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Es stehen aktuell keine Ergebnisse oder Clips zum Voting zur Verfügung. Bitte versuche es später erneut.'
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
    const round = getVotingRound()
    const key = getStorageKey()
    setSubmitting(true)
    try {
      const ipHash = await getUserIpHash()
      await submitVoteToDB(clipId, ipHash, round)
      localStorage.setItem(key, clipId)
      setVotedClipId(clipId)
      setView('voted')
    } catch (err) {
      if (err instanceof Error && err.message === 'Already voted') {
        localStorage.setItem(key, clipId)
        setVotedClipId(clipId)
        setView('voted')
      } else {
        setErrorMessage('Fehler beim Abstimmen. Bitte versuche es erneut.')
      }
    } finally {
      setSubmitting(false)
    }
  }, [voteModalClipId])

  const renderClipCard = (
    clip: Clip,
    options: { showVoteButton?: boolean; isVoted?: boolean } = {}
  ) => {
    const canEmbed = canEmbedClip(allowLocalEmbeds)
    return (
      <div
        key={clip.id}
        className={`clip-card${options.isVoted ? ' voted-clip' : ''}`}
      >
        <div
          className="clip-embed-wrapper"
          style={{ width: '100%', height: 160, marginBottom: 8 }}
        >
          {canEmbed ? (
            <iframe
              src={getEmbedUrl(clip.id)}
              title={clip.title}
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <img
              src={clip.thumbnail_url}
              alt={clip.title}
              className="clip-thumbnail"
              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
              onClick={() => window.open(clip.url, '_blank')}
            />
          )}
        </div>
        <div className="clip-info">
          <h3 className="clip-title">{clip.title}</h3>
          <div className="clip-meta">
            <span>👁️ {clip.view_count.toLocaleString()} Views</span>
            <span>⏱️ {Math.floor(clip.duration)}s</span>
            <span>📅 {formatDate(new Date(clip.created_at))}</span>
          </div>
          <div className="clip-creator">Erstellt von: {clip.creator_name}</div>
          {options.showVoteButton && (
            <button
              type="button"
              className="btn btn-primary vote-btn"
              onClick={() => setVoteModalClipId(clip.id)}
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

  const renderResultCard = (clip: Clip & { votes: number }, rank: number) => {
    const canEmbed = canEmbedClip(allowLocalEmbeds)
    return (
      <div key={clip.id} className="result-card">
        <div className="rank-badge">#{rank}</div>
        <div
          className="clip-embed-wrapper"
          style={{ width: '100%', height: 360, marginBottom: 8 }}
        >
          {canEmbed ? (
            <iframe
              src={getEmbedUrl(clip.id)}
              title={clip.title}
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <img
              src={clip.thumbnail_url}
              alt={clip.title}
              className="clip-thumbnail"
              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
              onClick={() => window.open(clip.url, '_blank')}
            />
          )}
        </div>
        <div className="clip-info">
          <h3 className="clip-title">{clip.title}</h3>
          <div className="clip-votes">
            <strong>🗳️ {clip.votes ?? 0} Stimmen</strong>
          </div>
          <div className="clip-meta">
            <span>👁️ {clip.view_count.toLocaleString()} Views</span>
            <span>⏱️ {Math.floor(clip.duration)}s</span>
            <span>📅 {formatDate(new Date(clip.created_at))}</span>
          </div>
          <div className="clip-creator">Erstellt von: {clip.creator_name}</div>
        </div>
      </div>
    )
  }

  return (
    <main className="container">
      <div>
        <h1 className="page-title">Clip des Monats</h1>
        <p>
          Hier kannst du für die Top 10 Clips des vergangenen Monats stimmen /
          die Ergebnisse einsehen.
        </p>
        <p style={{ marginBottom: 18 }}>
          <Link to="/clipdesjahres" className="btn">
            → Zum Clip des Jahres
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
          {view === 'voting' && clipsData && (
            <>
              <div className="voting-header">
                <h2>{isSecondVoting ? '🏆 Zweite Voting-Runde: Clip des Jahres' : 'Voting ist aktiv!'}</h2>
                <p>
                  Voting-Zeitraum:{' '}
                  {isSecondVoting && secondVotingConfig
                    ? `${formatDate(new Date(secondVotingConfig.started_at))} - ${formatDate(new Date(secondVotingConfig.ends_at))}`
                    : `${formatDate(getVotingPeriodOfMonth().start)} - ${formatDate(getVotingPeriodOfMonth().end)}`}
                </p>
                {isSecondVoting && secondVotingConfig && (
                  <p className="second-voting-notice">
                    Dies ist eine besondere zweite Voting-Runde für die Top{' '}
                    {clipsData.clips.length} Clips.
                  </p>
                )}
                <p>Du kannst für genau einen Clip abstimmen.</p>
                <p><strong>{clipsData.clips.length} Clips</strong> stehen zur Auswahl.</p>
              </div>
              <div className="clips-grid">
                {clipsData.clips.map((clip) => renderClipCard(clip, { showVoteButton: true }))}
              </div>
            </>
          )}
          {view === 'voted' && clipsData && votedClipId && (
            <>
              <div className="voted-message">
                <h2>✅ Vielen Dank für deine Stimme!</h2>
                <p>Du hast erfolgreich abgestimmt.</p>
                <p>Die Ergebnisse werden am Ende des Voting-Zeitraums veröffentlicht.</p>
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
          {view === 'results' && resultsData && (
            <>
              <div className="results-header">
                <h2>🏆 Top {resultsData.results.length} Clips</h2>
                <p>
                  Zeitraum: {formatDate(new Date(resultsData.period.start))} -{' '}
                  {formatDate(new Date(resultsData.period.end))}
                </p>
                <p>Gesamtstimmen: <strong>{resultsData.totalVotes ?? 0}</strong></p>
                <p>Berechnet am: {formatDate(new Date(resultsData.calculatedAt))}</p>
              </div>
              <div className="results-grid">
                {resultsData.results.map((clip, i) =>
                  renderResultCard(clip, i + 1)
                )}
              </div>
            </>
          )}
          {view === 'no-results' && (
            <div className="no-results-message">
              <h2>ℹ️ Noch keine Ergebnisse für den letzten Monat</h2>
              <p>Für den letzten Monat sind derzeit noch keine Ergebnisse verfügbar.</p>
              <p>Das Voting findet jeweils vom 22. bis zum Ende des Monats statt.</p>
              <p>Schau bitte am 22. wieder vorbei.</p>
            </div>
          )}
        </div>

        {/* Vote confirm modal */}
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

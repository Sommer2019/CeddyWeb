import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'
import { Link } from 'react-router-dom'
import './BartClicker.css'
import {
  type ShopItem,
  INITIAL_SHOP_ITEMS,
  BASE_COSTS,
  loadFromLocalStorage,
  saveToLocalStorage,
  calculateOfflineProgress,
  loadGameStateFromSupabase,
  syncGameStateToSupabase,
  loadLeaderboardFromSupabase,
  updateLeaderboardInSupabase,
  getUserIpHash,
  BART_USERNAME_KEY,
} from '../lib/bartClickerApi'

const COMBO_WINDOW_MS = 500
const COMBO_BONUS_PER_HIT = 0.1
const MAX_COMBO_MULTIPLIER = 0.4
const RANDOM_EVENT_CHANCE = 0.02
const BASE_OFFLINE_PERCENTAGE = 0.05
const OFFLINE_UPGRADE_BONUS = 0.05
const MAX_OFFLINE_UPGRADES = 10
const OFFLINE_UPGRADE_COST = 1

const RANDOM_EVENTS = [
  { name: 'Doppel-Power!', icon: '✨', effect: 'clickMultiplier' as const, value: 2, duration: 15000, color: '#FFD700' },
  { name: 'Goldener Bart!', icon: '💰', effect: 'clickMultiplier' as const, value: 3, duration: 10000, color: '#FFD700' },
  { name: 'Turbo-Haare!', icon: '🚀', effect: 'cpsMultiplier' as const, value: 2, duration: 20000, color: '#00FF00' },
  { name: 'Glücks-Klick!', icon: '🍀', effect: 'clickMultiplier' as const, value: 5, duration: 8000, color: '#00FF00' },
  { name: 'Mega-Wachstum!', icon: '🌟', effect: 'cpsMultiplier' as const, value: 3, duration: 15000, color: '#FF6B6B' },
]

export default function BartClicker(): JSX.Element {
  const [energy, setEnergy] = useState(0)
  const [totalEver, setTotalEver] = useState(0)
  const [cps, setCps] = useState(0)
  const [shopItems, setShopItems] = useState<ShopItem[]>(() =>
    INITIAL_SHOP_ITEMS.map((i) => ({ ...i, cost: i.cost }))
  )
  const [clickPower, setClickPower] = useState(1)
  const [rebirthCount, setRebirthCount] = useState(0)
  const [rebirthMultiplier, setRebirthMultiplier] = useState(1)
  const [offlineEarningUpgrades, setOfflineEarningUpgrades] = useState(0)
  const [username, setUsernameState] = useState<string | null>(() =>
    localStorage.getItem(BART_USERNAME_KEY)
  )
  const [comboCount, setComboCount] = useState(0)
  const [activeEvent, setActiveEvent] = useState<typeof RANDOM_EVENTS[0] | null>(null)
  const [eventEndTime, setEventEndTime] = useState(0)
  const [isLoadingGame, setIsLoadingGame] = useState(true)
  const [needsSync, setNeedsSync] = useState(false)
  const [leaderboardTab, setLeaderboardTab] = useState<'barthaare' | 'rebirths'>('barthaare')
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<Array<{ ip_hash: string; username: string; total_ever: number; rebirth_count: number }>>([])
  const [rebirthModalOpen, setRebirthModalOpen] = useState(false)
  const [usernameModalOpen, setUsernameModalOpen] = useState(false)
  const [offlineNotification, setOfflineNotification] = useState<{ progress: number; seconds: number } | null>(null)
  const [userIpHash, setUserIpHash] = useState<string | null>(null)
  const lastClickTime = useRef(0)
  const particlesRef = useRef<Array<{ id: number; x: number; y: number; value: number }>>([])
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; value: number }>>([])
  const particleIdRef = useRef(0)

  const recalcCps = useCallback(() => {
    const mult = Math.pow(2, rebirthCount)
    const passive = shopItems
      .filter((i) => i.type === 'passive')
      .reduce((acc, i) => acc + i.count * (i.cps ?? 0), 0)
    const upgradeClick = shopItems
      .filter((i) => i.type === 'click')
      .reduce((acc, i) => acc + i.count * (i.clickPower ?? 0), 0)
    setCps(passive * mult)
    setClickPower((1 + upgradeClick) * mult)
  }, [shopItems, rebirthCount])

  useEffect(() => {
    recalcCps()
  }, [recalcCps])

  const persistState = useCallback(() => {
    const state = {
      username,
      energy,
      total_ever: totalEver,
      rebirth_count: rebirthCount,
      rebirth_multiplier: rebirthMultiplier,
      offline_earning_upgrades: offlineEarningUpgrades,
      shop_items: shopItems.map((i) => ({ id: i.id, count: i.count, cost: i.cost })),
      last_updated: new Date().toISOString(),
    }
    saveToLocalStorage(state)
    setNeedsSync(true)
  }, [username, energy, totalEver, rebirthCount, rebirthMultiplier, offlineEarningUpgrades, shopItems])

  const syncToSupabase = useCallback(async () => {
    if (!userIpHash || !needsSync) return
    try {
      await syncGameStateToSupabase({
        ip_hash: userIpHash,
        username,
        energy,
        total_ever: totalEver,
        rebirth_count: rebirthCount,
        rebirth_multiplier: rebirthMultiplier,
        offline_earning_upgrades: offlineEarningUpgrades,
        shop_items: shopItems.map((i) => ({ id: i.id, count: i.count, cost: i.cost })),
        last_updated: new Date().toISOString(),
      })
      setNeedsSync(false)
    } catch {
      // ignore
    }
  }, [userIpHash, needsSync, username, energy, totalEver, rebirthCount, rebirthMultiplier, offlineEarningUpgrades, shopItems])

  const loadGame = useCallback(async () => {
    setIsLoadingGame(true)
    try {
      const ipHash = await getUserIpHash()
      setUserIpHash(ipHash)
      const local = loadFromLocalStorage()
      if (local) {
        const offline = calculateOfflineProgress(local, INITIAL_SHOP_ITEMS)
        const baseEnergy = local.energy ?? 0
        const baseTotal = local.total_ever ?? 0
        setEnergy(baseEnergy + offline.progress)
        setTotalEver(baseTotal + offline.progress)
        setRebirthCount(local.rebirth_count ?? 0)
        setRebirthMultiplier(local.rebirth_multiplier ?? 1)
        setOfflineEarningUpgrades(local.offline_earning_upgrades ?? 0)
        if (local.username) setUsernameState(local.username)
        if (local.shop_items?.length) {
          setShopItems((prev) =>
            prev.map((item) => {
              const si = local.shop_items!.find((s) => s.id === item.id)
              return si ? { ...item, count: si.count, cost: si.cost } : item
            })
          )
        }
        if (offline.progress > 0) setOfflineNotification({ progress: offline.progress, seconds: offline.offlineSeconds })
      }
      try {
        const remote = await loadGameStateFromSupabase(ipHash)
        if (remote) {
          const localTime = local?.last_updated ? new Date(local.last_updated).getTime() : 0
          const remoteTime = new Date(remote.last_updated).getTime()
          if (remoteTime > localTime) {
            setEnergy(remote.energy)
            setTotalEver(remote.total_ever)
            setRebirthCount(remote.rebirth_count)
            setRebirthMultiplier(remote.rebirth_multiplier)
            setOfflineEarningUpgrades(remote.offline_earning_upgrades)
            if (remote.username) setUsernameState(remote.username)
            if (remote.shop_items?.length) {
              setShopItems((prev) =>
                prev.map((item) => {
                  const si = remote.shop_items!.find((s) => s.id === item.id)
                  return si ? { ...item, count: si.count, cost: si.cost } : item
                })
              )
            }
            persistState()
          }
        }
      } catch {
        // offline
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingGame(false)
    }
  }, [])

  useEffect(() => {
    loadGame()
  }, [])

  useEffect(() => {
    if (!usernameModalOpen && !username) {
      const t = setTimeout(() => setUsernameModalOpen(true), 1000)
      return () => clearTimeout(t)
    }
  }, [username, usernameModalOpen])

  useEffect(() => {
    const id = setInterval(() => {
      if (cps > 0) {
        let gain = cps / 10
        if (activeEvent?.effect === 'cpsMultiplier') gain *= activeEvent.value
        setEnergy((e) => e + gain)
        setTotalEver((t) => t + gain)
      }
    }, 100)
    return () => clearInterval(id)
  }, [cps, activeEvent])

  useEffect(() => {
    const id = setInterval(persistState, 10000)
    return () => clearInterval(id)
  }, [persistState])

  useEffect(() => {
    const id = setInterval(() => {
      if (navigator.onLine && needsSync) syncToSupabase()
    }, 30000)
    return () => clearInterval(id)
  }, [needsSync, syncToSupabase])

  useEffect(() => {
    const onBeforeUnload = () => {
      persistState()
      if (navigator.onLine) syncToSupabase()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [persistState, syncToSupabase])

  const doClick = useCallback(
    (e: React.MouseEvent) => {
      const now = Date.now()
      const combo = now - lastClickTime.current < COMBO_WINDOW_MS ? comboCount + 1 : 1
      lastClickTime.current = now
      setComboCount(combo)
      let value = clickPower
      if (activeEvent?.effect === 'clickMultiplier') value *= activeEvent.value
      if (combo > 1) {
        const bonus = Math.min((combo - 1) * COMBO_BONUS_PER_HIT, MAX_COMBO_MULTIPLIER)
        value *= 1 + bonus
      }
      setEnergy((prev) => prev + value)
      setTotalEver((prev) => prev + value)
      const rect = (e.target as HTMLElement).closest('.bart-character')?.getBoundingClientRect()
      const x = rect ? rect.left + rect.width / 2 : e.clientX
      const y = rect ? rect.top + rect.height / 2 : e.clientY
      const id = ++particleIdRef.current
      setParticles((p) => [...p, { id, x, y, value }])
      setTimeout(() => setParticles((p) => p.filter((x) => x.id !== id)), 600)
      if (Math.random() < RANDOM_EVENT_CHANCE && !activeEvent) {
        const ev = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)]
        setActiveEvent(ev)
        setEventEndTime(now + ev.duration)
        setTimeout(() => setActiveEvent(null), ev.duration)
      }
    },
    [clickPower, activeEvent, comboCount]
  )

  const buyItem = useCallback(
    (index: number) => {
      const item = shopItems[index]
      if (energy < item.cost) return
      setEnergy((e) => e - item.cost)
      setShopItems((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], count: next[index].count + 1, cost: Math.floor(next[index].cost * 1.15) }
        return next
      })
      persistState()
    },
    [energy, shopItems, persistState]
  )

  const calculateRebirthCost = () => {
    const maxCost = Math.max(...shopItems.map((i) => i.cost))
    return Math.floor(maxCost * 10)
  }

  const performRebirth = useCallback(() => {
    const cost = calculateRebirthCost()
    if (energy < cost) return
    setRebirthModalOpen(false)
    setEnergy(0)
    setTotalEver(0)
    setShopItems((prev) =>
      prev.map((item) => ({
        ...item,
        count: 0,
        cost: Math.floor((BASE_COSTS[item.id] ?? item.cost) * Math.pow(1.5, rebirthCount + 1)),
      }))
    )
    setRebirthCount((r) => r + 1)
    setRebirthMultiplier((m) => m * 2)
    recalcCps()
    persistState()
    if (username && userIpHash) {
      updateLeaderboardInSupabase({
        ip_hash: userIpHash,
        username,
        energy: 0,
        total_ever: 0,
        rebirth_count: rebirthCount + 1,
        last_updated: new Date().toISOString(),
      }).catch(() => {})
    }
  }, [energy, rebirthCount, username, userIpHash, recalcCps, persistState])

  const buyOfflineUpgrade = useCallback(() => {
    if (offlineEarningUpgrades >= MAX_OFFLINE_UPGRADES || rebirthCount < OFFLINE_UPGRADE_COST) return
    setOfflineEarningUpgrades((u) => u + 1)
    setRebirthCount((r) => r - OFFLINE_UPGRADE_COST)
    setRebirthMultiplier(Math.pow(2, rebirthCount - OFFLINE_UPGRADE_COST))
    recalcCps()
    persistState()
  }, [offlineEarningUpgrades, rebirthCount, recalcCps, persistState])

  const openLeaderboard = useCallback(async () => {
    if (!username) {
      setUsernameModalOpen(true)
      return
    }
    setLeaderboardOpen(true)
    try {
      const data = await loadLeaderboardFromSupabase(leaderboardTab)
      setLeaderboardData(data)
    } catch {
      setLeaderboardData([])
    }
  }, [username, leaderboardTab])

  useEffect(() => {
    if (leaderboardOpen && username) {
      loadLeaderboardFromSupabase(leaderboardTab).then(setLeaderboardData).catch(() => setLeaderboardData([]))
    }
  }, [leaderboardOpen, leaderboardTab, username])

  useEffect(() => {
    if (username && userIpHash && !isLoadingGame) {
      updateLeaderboardInSupabase({
        ip_hash: userIpHash,
        username,
        energy: Math.floor(energy),
        total_ever: Math.floor(totalEver),
        rebirth_count: rebirthCount,
        last_updated: new Date().toISOString(),
      }).catch(() => {})
    }
  }, [username, userIpHash, energy, totalEver, rebirthCount, isLoadingGame])

  const usernameInputRef = useRef<HTMLInputElement>(null)
  const setUsernameFromInput = useCallback(() => {
    const name = usernameInputRef.current?.value?.trim() ?? ''
    if (name.length < 3) {
      alert('Nutzername muss mindestens 3 Zeichen lang sein!')
      return
    }
    setUsernameState(name)
    localStorage.setItem(BART_USERNAME_KEY, name)
    setUsernameModalOpen(false)
  }, [])

  const growth = Math.sqrt(energy) * 1.6
  const startY = 60
  const endY = startY + growth
  const mouthW = 12
  const mouthH = 4
  const mouthY = 62
  const mouthCX = 50
  const beardPath = `
    M 30 ${startY}
    Q 50 ${startY + 3} 70 ${startY}
    L 70 ${endY}
    Q 50 ${endY + 12 + growth / 10} 30 ${endY}
    Z
    M ${mouthCX - mouthW / 2} ${mouthY}
    a ${mouthW / 2} ${mouthH / 2} 0 1 0 ${mouthW} 0
    a ${mouthW / 2} ${mouthH / 2} 0 1 0 -${mouthW} 0
    Z
  `
  const beardColor = activeEvent?.name === 'Goldener Bart!' ? '#FFD700' : energy > 5000 ? '#7C4DFF' : '#3d2b1f'

  return (
    <div className="bart-clicker-root">
      <main className="bart-main">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h1 className="bart-score-big">{Math.floor(energy).toLocaleString()}</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '5px 0 0 0' }}>
            Barthaare: {cps.toFixed(1)} / s
            {clickPower > 1 && ` | Klick: ${clickPower.toFixed(0)}`}
            {rebirthCount > 0 && ` | ♻️${rebirthMultiplier}x`}
          </p>
          {activeEvent && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 10,
                fontWeight: 'bold',
                fontSize: '1.2rem',
                backgroundColor: `${activeEvent.color}20`,
                border: `2px solid ${activeEvent.color}`,
                color: activeEvent.color,
              }}
            >
              {activeEvent.icon} {activeEvent.name}
            </div>
          )}
          {comboCount > 1 && (
            <div style={{ marginTop: 5, color: '#FFD700', fontWeight: 'bold', fontSize: '0.9rem' }}>
              🔥 COMBO x{comboCount}! (+{Math.min((comboCount - 1) * COMBO_BONUS_PER_HIT * 100, MAX_COMBO_MULTIPLIER * 100).toFixed(0)}%)
            </div>
          )}
        </div>
        <div className="bart-character" onClick={doClick}>
          <svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 450, filter: 'drop-shadow(0 15px 40px rgba(0,0,0,0.6))' }}>
            <rect x="30" y="30" width="40" height="35" rx="6" fill="#d4a373" />
            <g>
              <rect x="25" y="32" width="50" height="5" rx="2" fill="#7C4DFF" />
              <path d="M30 32 L70 32 L70 25 Q 50 15 30 25 Z" fill="#7C4DFF" />
              <circle cx="50" cy="18" r="2" fill="#5c38cc" />
              {rebirthCount > 0 && (
                <g>
                  <circle cx="65" cy="20" r="6" fill="#FFD700" stroke="#FFA500" strokeWidth="1" />
                  <text x="65" y="23" fontSize="8" fontWeight="bold" fill="#000" textAnchor="middle">♻</text>
                </g>
              )}
            </g>
            <g stroke="#111" strokeWidth="1.2" fill="none">
              <rect x="34" y="42" width="10" height="7" rx="1" />
              <rect x="56" y="42" width="10" height="7" rx="1" />
              <path d="M44 46 h12" />
            </g>
            <circle cx="39" cy="45" r="1" fill="#000" />
            <circle cx="61" cy="45" r="1" fill="#000" />
            <path d={beardPath} fill={beardColor} fillRule="evenodd" />
            {activeEvent?.name === 'Glücks-Klick!' && (
              <text x="50" y="70" fontSize="12" fill="#00FF00" textAnchor="middle">🍀</text>
            )}
          </svg>
        </div>
      </main>

      <aside className="bart-aside">
        <h2>Bart-Shop</h2>
        <div className="bart-shop-list">
          {shopItems.filter((i) => i.type === 'passive').map((item) => {
            const idx = shopItems.findIndex((x) => x.id === item.id)
            return (
              <div
                key={item.id}
                className={`bart-item-card ${energy >= item.cost ? '' : 'bart-disabled'}`}
                onClick={() => buyItem(idx)}
              >
                <div style={{ fontSize: 20, minWidth: 35, height: 35, background: 'var(--box-gradient)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, display: 'block', fontSize: '0.85rem' }}>{item.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>+{item.cps}/s</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.75rem', display: 'block' }}>{item.cost.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--muted)', opacity: 0.3 }}>{item.count}</div>
              </div>
            )
          })}
          {shopItems.filter((i) => i.type === 'click').map((item) => {
            const idx = shopItems.findIndex((x) => x.id === item.id)
            return (
              <div
                key={item.id}
                className={`bart-item-card ${energy >= item.cost ? '' : 'bart-disabled'}`}
                onClick={() => buyItem(idx)}
              >
                <div style={{ fontSize: 20, minWidth: 35, height: 35, background: 'var(--box-gradient)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, display: 'block', fontSize: '0.85rem' }}>{item.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>+{item.clickPower} pro Klick</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.75rem', display: 'block' }}>{item.cost.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--muted)', opacity: 0.3 }}>{item.count}</div>
              </div>
            )
          })}
        </div>
        <div className="bart-rebirth-card" style={{ marginTop: 15, paddingTop: 15, borderTop: '1px solid var(--box-border)' }}>
          <div className={`bart-rebirth-card ${energy >= calculateRebirthCost() ? '' : 'bart-disabled'}`} onClick={() => energy >= calculateRebirthCost() && setRebirthModalOpen(true)}>
            <div style={{ fontSize: '2rem', marginBottom: 5 }}>♻️</div>
            <div style={{ fontWeight: 900, fontSize: '1rem', color: '#FFD700', marginBottom: 5 }}>REBIRTH</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 8 }}>Verdoppelt Clicks & Auto-Clicks</div>
            <div style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.9rem' }}>{calculateRebirthCost().toLocaleString()}</div>
            <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#FFD700' }}>Rebirths: {rebirthCount}</div>
          </div>
          <div style={{ marginTop: 20, paddingTop: 15, borderTop: '1px solid var(--box-border)' }}>
            <h3 style={{ color: 'var(--accent)', fontSize: '0.75rem', textTransform: 'uppercase', margin: '0 0 10px 0' }}>Offline Upgrades</h3>
            <div
              className={`bart-rebirth-card ${offlineEarningUpgrades >= MAX_OFFLINE_UPGRADES || rebirthCount < OFFLINE_UPGRADE_COST ? 'bart-disabled' : ''}`}
              onClick={buyOfflineUpgrade}
            >
              <div style={{ fontSize: '2rem', marginBottom: 5 }}>💤</div>
              <div style={{ fontWeight: 900, fontSize: '1rem', color: '#FFD700', marginBottom: 5 }}>Offline Boost</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 8 }}>
                Level: {offlineEarningUpgrades}/{MAX_OFFLINE_UPGRADES} ({Math.round((BASE_OFFLINE_PERCENTAGE + offlineEarningUpgrades * OFFLINE_UPGRADE_BONUS) * 100)}%)
              </div>
              <div style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Kosten: {OFFLINE_UPGRADE_COST} Rebirth</div>
            </div>
          </div>
        </div>
      </aside>

      {username && (
        <div style={{ position: 'fixed', top: 20, left: 20, padding: '8px 16px', background: 'var(--card-bg)', border: '1px solid var(--box-border)', borderRadius: 8, fontSize: '0.9rem', zIndex: 100 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{username}</span>
        </div>
      )}
      <button type="button" className="bart-leaderboard-btn" onClick={openLeaderboard}>🏆</button>
      <Link to="/" className="bart-home-btn">⤴ Zur Startseite</Link>

      {particles.map(({ id, x, y, value }) => (
        <div
          key={id}
          className="bart-particle"
          style={{
            left: x,
            top: y,
            position: 'fixed',
            transform: 'translate(-50%, -50%)',
            fontSize: value >= 10 ? '1.5rem' : '1rem',
            color: value >= 10 ? '#FFD700' : '#fff',
          }}
        >
          +{value >= 10 ? Math.floor(value) : value.toFixed(1)}
        </div>
      ))}

      {/* Username modal */}
      <div className={`bart-modal-overlay ${usernameModalOpen ? 'bart-active' : ''}`} onClick={() => !username && setUsernameModalOpen(false)}>
        <div className="bart-modal-inner" onClick={(e) => e.stopPropagation()}>
          <h2>Willkommen beim Bartclicker!</h2>
          <p>Gib einen Nutzernamen ein, um in der Bestenliste teilzunehmen (optional):</p>
          <input
            ref={usernameInputRef}
            type="text"
            placeholder="Dein Nutzername"
            maxLength={20}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setUsernameFromInput()
            }}
            style={{ width: '100%', padding: 12, background: 'var(--card-bg)', border: '1px solid var(--box-border)', borderRadius: 8, color: '#e6eef8', fontSize: '1rem', margin: '15px 0' }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
            <button type="button" onClick={setUsernameFromInput} style={{ padding: '12px 24px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>Speichern</button>
            <button type="button" onClick={() => setUsernameModalOpen(false)} style={{ padding: '12px 24px', background: 'var(--card-bg)', color: 'var(--muted)', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>Später</button>
          </div>
        </div>
      </div>

      {/* Leaderboard modal */}
      <div className={`bart-modal-overlay ${leaderboardOpen ? 'bart-active' : ''}`} onClick={() => setLeaderboardOpen(false)} style={{ justifyContent: 'flex-start' }}>
        <div className="bart-modal-inner" style={{ maxWidth: 600, maxHeight: '100vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
          <h2>🏆 Bestenliste</h2>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button type="button" onClick={() => setLeaderboardTab('barthaare')} style={{ flex: 1, padding: 10, background: leaderboardTab === 'barthaare' ? 'var(--accent)' : 'var(--card-bg)', border: '1px solid var(--box-border)', borderRadius: 8, cursor: 'pointer', color: 'inherit' }}>Barthaare</button>
            <button type="button" onClick={() => setLeaderboardTab('rebirths')} style={{ flex: 1, padding: 10, background: leaderboardTab === 'rebirths' ? 'var(--accent)' : 'var(--card-bg)', border: '1px solid var(--box-border)', borderRadius: 8, cursor: 'pointer', color: 'inherit' }}>Rebirths</button>
          </div>
          <div className="bart-leaderboard-list">
            {leaderboardData.length === 0 && <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Noch keine Einträge</p>}
            {leaderboardData.map((entry, index) => {
              const rank = index + 1
              const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''
              const value = leaderboardTab === 'barthaare' ? Math.floor(entry.total_ever).toLocaleString() : entry.rebirth_count
              const isCurrent = entry.ip_hash === userIpHash
              return (
                <div key={entry.ip_hash} className="bart-leaderboard-item" style={isCurrent ? { background: 'rgba(124, 77, 255, 0.2)', borderColor: 'var(--accent)' } : undefined}>
                  <div className={`bart-leaderboard-rank ${rankClass}`}>#{rank}</div>
                  <div style={{ flex: 1, marginLeft: 15 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{entry.username}{isCurrent ? ' (Du)' : ''}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{leaderboardTab === 'barthaare' ? 'Barthaare' : 'Rebirths'}</div>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{value}</div>
                </div>
              )
            })}
          </div>
          <button type="button" onClick={() => setLeaderboardOpen(false)} style={{ marginTop: 20, padding: '12px 24px', background: 'var(--card-bg)', color: 'var(--muted)', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>Schließen</button>
        </div>
      </div>

      {/* Rebirth confirm modal */}
      <div className={`bart-modal-overlay ${rebirthModalOpen ? 'bart-active' : ''}`} onClick={() => setRebirthModalOpen(false)}>
        <div className="bart-modal-inner" onClick={(e) => e.stopPropagation()}>
          <h2>♻️ Rebirth durchführen?</h2>
          <p style={{ color: '#ff6b6b', fontWeight: 'bold', margin: '15px 0' }}>Du verlierst: Alle Barthaare, Alle Shop-Items</p>
          <p style={{ color: '#51cf66', fontWeight: 'bold', margin: '15px 0' }}>Du erhältst: 2x Clicks & Auto-Clicks</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
            <button type="button" onClick={performRebirth} style={{ padding: '12px 24px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>Bestätigen</button>
            <button type="button" onClick={() => setRebirthModalOpen(false)} style={{ padding: '12px 24px', background: 'var(--card-bg)', color: 'var(--muted)', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>Abbrechen</button>
          </div>
        </div>
      </div>

      {offlineNotification && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '30px 40px',
            borderRadius: 15,
            fontSize: '1.5rem',
            fontWeight: 'bold',
            textAlign: 'center',
            zIndex: 10000,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 10 }}>🎉</div>
          <div>Willkommen zurück!</div>
          <div style={{ fontSize: '1.2rem', marginTop: 10 }}>+{Math.floor(offlineNotification.progress).toLocaleString()} Barthaare!</div>
          <button type="button" onClick={() => setOfflineNotification(null)} style={{ marginTop: 20, padding: '10px 20px', background: 'white', color: '#764ba2', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>OK</button>
        </div>
      )}
    </div>
  )
}

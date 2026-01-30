import { getSupabase } from './supabase'
import { getUserIpHash } from './votingApi'

const LOCAL_STORAGE_KEY = 'bart_clicker_game_state'

export interface ShopItem {
  id: number
  name: string
  cost: number
  cps?: number
  clickPower?: number
  icon: string
  type: 'passive' | 'click'
  count: number
}

export const BASE_COSTS: Record<number, number> = {
  0: 15, 1: 100, 2: 500, 3: 2500, 4: 12000, 5: 60000, 6: 250000,
  7: 50, 8: 500, 9: 5000, 10: 50000,
}

export const INITIAL_SHOP_ITEMS: ShopItem[] = [
  { id: 0, name: 'Bart-Kamm', cost: 15, cps: 0.1, icon: '🪮', type: 'passive', count: 0 },
  { id: 1, name: 'WLAN-Bartöl', cost: 100, cps: 1, icon: '💧', type: 'passive', count: 0 },
  { id: 2, name: 'Energy Drink', cost: 500, cps: 4, icon: '⚡', type: 'passive', count: 0 },
  { id: 3, name: 'Loot-Lama', cost: 2500, cps: 12, icon: '🦙', type: 'passive', count: 0 },
  { id: 4, name: 'Sektenschwur', cost: 12000, cps: 45, icon: '🐑', type: 'passive', count: 0 },
  { id: 5, name: 'Dampf-Pflege', cost: 60000, cps: 180, icon: '⚙️', type: 'passive', count: 0 },
  { id: 6, name: 'Bart-Fabrik', cost: 250000, cps: 800, icon: '🏭', type: 'passive', count: 0 },
  { id: 7, name: 'Starker Griff', cost: 50, clickPower: 1, icon: '💪', type: 'click', count: 0 },
  { id: 8, name: 'Bart-Verstärker', cost: 500, clickPower: 5, icon: '🔥', type: 'click', count: 0 },
  { id: 9, name: 'Mega-Klicker', cost: 5000, clickPower: 25, icon: '⚡', type: 'click', count: 0 },
  { id: 10, name: 'Göttlicher Touch', cost: 50000, clickPower: 100, icon: '✨', type: 'click', count: 0 },
]

export interface SavedGameState {
  username: string | null
  energy: number
  total_ever: number
  rebirth_count: number
  rebirth_multiplier: number
  offline_earning_upgrades: number
  shop_items: { id: number; count: number; cost: number }[]
  last_updated: string
}

export function loadFromLocalStorage(): SavedGameState | null {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // ignore
  }
  return null
}

export function saveToLocalStorage(state: SavedGameState): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function calculateOfflineProgress(
  savedState: SavedGameState,
  shopItems: ShopItem[]
): { progress: number; offlineSeconds: number } {
  if (!savedState?.last_updated) return { progress: 0, offlineSeconds: 0 }
  const lastSaved = new Date(savedState.last_updated).getTime()
  const now = Date.now()
  const offlineSeconds = Math.min((now - lastSaved) / 1000, 24 * 3600)
  const cappedSeconds = Math.min(offlineSeconds, 3600)
  let savedCps = 0
  if (savedState.shop_items?.length) {
    savedState.shop_items.forEach((si) => {
      const item = shopItems.find((i) => i.id === si.id)
      if (item?.type === 'passive') savedCps += (si.count || 0) * (item.cps ?? 0)
    })
  }
  const mult = savedState.rebirth_multiplier ?? 1
  const offlinePct = 0.05 + (savedState.offline_earning_upgrades ?? 0) * 0.05
  const progress = savedCps * cappedSeconds * offlinePct * mult
  return { progress, offlineSeconds: cappedSeconds }
}

export async function syncGameStateToSupabase(state: {
  ip_hash: string
  username: string | null
  energy: number
  total_ever: number
  rebirth_count: number
  rebirth_multiplier: number
  offline_earning_upgrades: number
  shop_items: { id: number; count: number; cost: number }[]
  last_updated: string
}): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('bart_clicker_game_state')
    .upsert(state, { onConflict: 'ip_hash' })
  if (error) throw error
}

export async function loadGameStateFromSupabase(ipHash: string): Promise<SavedGameState | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('bart_clicker_game_state')
    .select('*')
    .eq('ip_hash', ipHash)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null
  const d = data as Record<string, unknown>
  return {
    username: (d.username as string) ?? null,
    energy: parseFloat(String(d.energy ?? 0)),
    total_ever: parseFloat(String(d.total_ever ?? 0)),
    rebirth_count: parseInt(String(d.rebirth_count ?? 0), 10),
    rebirth_multiplier: parseFloat(String(d.rebirth_multiplier ?? 1)),
    offline_earning_upgrades: parseInt(String(d.offline_earning_upgrades ?? 0), 10),
    shop_items: Array.isArray(d.shop_items) ? d.shop_items as { id: number; count: number; cost: number }[] : [],
    last_updated: String(d.last_updated ?? new Date().toISOString()),
  }
}

export async function updateLeaderboardInSupabase(entry: {
  ip_hash: string
  username: string
  energy: number
  total_ever: number
  rebirth_count: number
  last_updated: string
}): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('bart_clicker_leaderboard')
    .upsert(entry, { onConflict: 'ip_hash' })
  if (error) throw error
}

export async function loadLeaderboardFromSupabase(
  sortBy: 'total_ever' | 'rebirth_count'
): Promise<Array<{ ip_hash: string; username: string; total_ever: number; rebirth_count: number }>> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('bart_clicker_leaderboard')
    .select('ip_hash, username, total_ever, rebirth_count')
    .order(sortBy, { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as Array<{ ip_hash: string; username: string; total_ever: number; rebirth_count: number }>
}

export { getUserIpHash }
export const BART_USERNAME_KEY = 'bart_clicker_username'

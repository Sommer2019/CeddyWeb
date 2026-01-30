import { getSupabase } from './supabase'

export interface Clip {
  id: string
  url: string
  embed_url?: string
  broadcaster_id?: string
  broadcaster_name?: string
  creator_id?: string
  creator_name: string
  video_id?: string
  game_id?: string
  language?: string
  title: string
  view_count: number
  created_at: string
  thumbnail_url: string
  duration: number
  vod_offset?: number
  votes?: number
}

export interface ClipsData {
  clips: Clip[]
  fetchedAt?: string
  period?: { start: string | null; end: string | null }
}

export interface ResultClip extends Clip {
  votes: number
}

export interface ResultsData {
  results: ResultClip[]
  calculatedAt: string
  period: { start: string; end: string }
  totalVotes: number
}

export interface SecondVotingConfig {
  is_active: boolean
  started_at: string
  ends_at: string
  source_month?: number
  source_year?: number
}

export interface CdjVotingConfig {
  is_active: boolean
  started_at: string
  ends_at: string
  target_year?: number
}

export async function getUserIpHash(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    const ip = data.ip as string
    const msgBuffer = new TextEncoder().encode(ip)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  } catch {
    if (!sessionStorage.getItem('session_id')) {
      sessionStorage.setItem('session_id', Math.random().toString(36).slice(2))
    }
    return sessionStorage.getItem('session_id')!
  }
}

function mapClip(row: Record<string, unknown>): Clip {
  return {
    id: row.clip_id as string,
    url: row.url as string,
    embed_url: row.embed_url as string | undefined,
    broadcaster_id: row.broadcaster_id as string | undefined,
    broadcaster_name: row.broadcaster_name as string | undefined,
    creator_id: row.creator_id as string | undefined,
    creator_name: row.creator_name as string,
    video_id: row.video_id as string | undefined,
    game_id: row.game_id as string | undefined,
    language: row.language as string | undefined,
    title: row.title as string,
    view_count: (row.view_count as number) ?? 0,
    created_at: row.created_at as string,
    thumbnail_url: row.thumbnail_url as string,
    duration: (row.duration as number) ?? 0,
    vod_offset: row.vod_offset as number | undefined,
  }
}

export async function fetchClipsFromDB(): Promise<ClipsData> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('clips')
    .select('*')
    .order('view_count', { ascending: false })

  if (error) throw error

  const clips = (data ?? []).map((row) => mapClip(row as Record<string, unknown>))
  const first = data?.[0] as Record<string, unknown> | undefined
  return {
    clips,
    fetchedAt: first?.fetched_at as string | undefined,
    period: first
      ? { start: first.period_start as string | null, end: first.period_end as string | null }
      : { start: null, end: null },
  }
}

export async function fetchResultsFromDB(): Promise<ResultsData | null> {
  const supabase = getSupabase()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  let { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('year', currentYear)
    .eq('month', currentMonth)
    .order('rank', { ascending: true })

  if (error) throw error

  if (!data || data.length === 0) {
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const result = await supabase
      .from('results')
      .select('*')
      .eq('year', prevYear)
      .eq('month', prevMonth)
      .order('rank', { ascending: true })
    if (result.error) throw result.error
    data = result.data
  }

  if (!data || data.length === 0) return null

  const first = data[0] as Record<string, unknown>
  return {
    results: data.map((row) => {
      const r = row as Record<string, unknown>
      return { ...mapClip(r), votes: (r.votes as number) ?? 0 }
    }),
    calculatedAt: first.calculated_at as string,
    period: {
      start: first.period_start as string,
      end: first.period_end as string,
    },
    totalVotes: (first.total_votes as number) ?? 0,
  }
}

export async function getSecondVotingConfig(): Promise<SecondVotingConfig | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('second_voting_config')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as SecondVotingConfig | null
}

export async function submitVoteToDB(
  clipId: string,
  ipHash: string,
  votingRound: 'monthly' | 'second' | 'cdj' = 'monthly'
): Promise<void> {
  const supabase = getSupabase()
  const { data: existing } = await supabase
    .from('votes')
    .select('id')
    .eq('ip_hash', ipHash)
    .eq('voting_round', votingRound)
    .single()

  if (existing) throw new Error('Already voted')

  const { error } = await supabase.from('votes').insert({
    ip_hash: ipHash,
    clip_id: clipId,
    voting_round: votingRound,
    voted_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function getClipDesJahresVotingConfig(): Promise<CdjVotingConfig | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cdj_voting_config')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as CdjVotingConfig | null
}

export async function fetchClipDesJahresWinner(
  year: number
): Promise<{ clip_id: string; votes: number; [k: string]: unknown } | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cdj_winners')
    .select('*')
    .eq('year', year)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as { clip_id: string; votes: number; [k: string]: unknown } | null
}

export async function fetchClipDesJahres(
  year: number
): Promise<Array<Record<string, unknown>>> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('clip_des_jahres')
    .select('*')
    .eq('year', year)
    .order('month', { ascending: true })
    .order('votes', { ascending: false })

  if (error) throw error
  return (data ?? []) as Array<Record<string, unknown>>
}

/** CDJ period: Dec (year-1) through Nov (year) */
export async function fetchClipDesJahresPeriod(
  cdjYear: number
): Promise<Array<Record<string, unknown> & { month: number; votes: number }>> {
  const supabase = getSupabase()
  const { data: decData, error: decError } = await supabase
    .from('clip_des_jahres')
    .select('*')
    .eq('year', cdjYear - 1)
    .eq('month', 12)
    .order('votes', { ascending: false })
  if (decError && decError.code !== 'PGRST116') throw decError

  const { data: currData, error: currError } = await supabase
    .from('clip_des_jahres')
    .select('*')
    .eq('year', cdjYear)
    .gte('month', 1)
    .lte('month', 11)
    .order('month', { ascending: true })
    .order('votes', { ascending: false })
  if (currError && currError.code !== 'PGRST116') throw currError

  return [
    ...((decData ?? []) as Array<Record<string, unknown> & { month: number; votes: number }>),
    ...((currData ?? []) as Array<Record<string, unknown> & { month: number; votes: number }>),
  ]
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function canEmbedClip(allowLocalEmbeds?: boolean): boolean {
  if (allowLocalEmbeds) return true
  const hostname =
    typeof window !== 'undefined' ? window.location.hostname || window.location.host || '' : ''
  if (!hostname) return false
  const isLocal =
    hostname === 'localhost' || hostname.startsWith('127.') || hostname === '::1'
  return !isLocal
}

export function getEmbedUrl(clipId: string): string {
  const parent =
    typeof window !== 'undefined' ? window.location.host : 'hd1920x1080.de'
  return `https://clips.twitch.tv/embed?clip=${clipId}&parent=${parent}`
}

const VOTING_START_DAY = 22

export function getVotingPeriodOfMonth(ref = new Date()): { start: Date; end: Date } {
  const year = ref.getFullYear()
  const month = ref.getMonth()
  const lastDay = new Date(year, month + 1, 0)
  const lastDayOfMonth = lastDay.getDate()
  const start = new Date(year, month, VOTING_START_DAY, 0, 0, 0, 0)
  const end = new Date(year, month, lastDayOfMonth, 23, 59, 59, 999)
  return { start, end }
}

export function isInVotingPeriod(now = new Date()): boolean {
  const { start, end } = getVotingPeriodOfMonth(now)
  return now >= start && now <= end
}

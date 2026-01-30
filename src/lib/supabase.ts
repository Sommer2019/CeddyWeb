import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.SUPABASE_URL
const anonKey = import.meta.env.SUPABASE_PUBLISHABLE_KEY

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!url || !anonKey) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env and set these (same values as SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY).'
      )
    }
    client = createClient(url, anonKey)
  }
  return client
}

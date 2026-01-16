Supabase schema for Clip des Monats

Run these SQL statements in the Supabase SQL editor to create the tables used by the frontend.

-- clips table
CREATE TABLE public.clips (
  id TEXT PRIMARY KEY,
  title TEXT,
  url TEXT,
  thumbnail_url TEXT,
  embed_url TEXT,
  broadcaster_id TEXT,
  broadcaster_name TEXT,
  creator_id TEXT,
  creator_name TEXT,
  video_id TEXT,
  game_id TEXT,
  language TEXT,
  view_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  duration FLOAT,
  vod_offset INTEGER,
  meta JSONB,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- votes table
CREATE TABLE public.votes (
  id BIGSERIAL PRIMARY KEY,
  clip_id TEXT REFERENCES public.clips(id) ON DELETE CASCADE,
  ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- results table
CREATE TABLE public.results (
  month_key TEXT PRIMARY KEY,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- optional config table (for site settings)
CREATE TABLE public.config (
  key TEXT PRIMARY KEY,
  value JSONB
);

Notes:
- If you prefer to store IPs in Postgres' native INET type, change `ip TEXT` to `ip INET`.
- For GDPR reasons you may prefer storing only a salted hash of the IP: add a server-side function to hash the IP before insert.
- Secure the database: do NOT put the service_role key in client JavaScript. Use Edge Functions/Serverless functions with the service_role key to perform writes that require IP detection or preventing abuse.
- If using client-side writes with the publishable key, make sure RLS policies allow the intended operations (or configure table as public writeable, which is less secure).

---

Recommended migration and hardening (run these after creating the base tables):

-- 1) Add a nullable ip_hash column (preferred: store only a salted hash of the IP)
ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS ip_hash TEXT;

-- 2) Create a unique constraint to prevent duplicate votes per clip/ip_hash
CREATE UNIQUE INDEX IF NOT EXISTS uniq_votes_clip_ip_hash ON public.votes (clip_id, ip_hash);

-- 3) Optional: remove raw ip column if you only want to store hashes
-- ALTER TABLE public.votes DROP COLUMN ip;

-- 4) Add index to speed up aggregation by clip
CREATE INDEX IF NOT EXISTS idx_votes_clip ON public.votes (clip_id);

-- Notes about ip hashing:
-- Implement hashing server-side using a secret salt (env var IP_SALT). Example (Node):
-- const crypto = require('crypto');
-- const ipHash = crypto.createHmac('sha256', process.env.IP_SALT).update(clientIp).digest('hex');
-- Store ip_hash instead of the raw IP.

-- RLS / Row Level Security:
-- If you plan to allow any client writes with the publishable key, configure RLS policies carefully.
-- Recommended: keep write operations server-side (only publishable key used for reads).

-- Backup / migration of existing JSON files:
-- If you want to import existing `votingData/*.json` into the DB, write a one-time script that reads the JSON and performs `INSERT ... ON CONFLICT DO NOTHING`.

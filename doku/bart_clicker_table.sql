-- SQL-Befehl für die neue Bart Klicker Spielstand-Tabelle
-- Dieser Befehl erstellt eine Tabelle in Supabase, die den Spielstand nach gehashter IP speichert

-- Tabelle: bart_clicker_game_state
-- Speichert den Spielstand des Bart Klicker Spiels nach gehashter IP
CREATE TABLE IF NOT EXISTS bart_clicker_game_state (
    id BIGSERIAL PRIMARY KEY,
    ip_hash TEXT NOT NULL UNIQUE,
    username TEXT UNIQUE,  -- UNIQUE: Username muss eindeutig sein
    energy NUMERIC NOT NULL DEFAULT 0,
    total_ever NUMERIC NOT NULL DEFAULT 0,
    rebirth_count INTEGER NOT NULL DEFAULT 0,
    rebirth_multiplier NUMERIC NOT NULL DEFAULT 1,
    offline_earning_upgrades INTEGER NOT NULL DEFAULT 0,
    shop_items JSONB NOT NULL DEFAULT '[]',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_bart_clicker_ip_hash ON bart_clicker_game_state(ip_hash);
CREATE INDEX IF NOT EXISTS idx_bart_clicker_game_state_username ON bart_clicker_game_state(username) WHERE username IS NOT NULL;

-- Row Level Security (RLS) aktivieren
ALTER TABLE bart_clicker_game_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies für bart_clicker_game_state
-- Erlaubt Benutzern, ihren eigenen Spielstand zu lesen
CREATE POLICY "Allow users to read their own game state"
    ON bart_clicker_game_state FOR SELECT
    USING (true);

-- Erlaubt Benutzern, ihren eigenen Spielstand einzufügen
CREATE POLICY "Allow users to insert their own game state"
    ON bart_clicker_game_state FOR INSERT
    WITH CHECK (true);

-- Erlaubt Benutzern, ihren eigenen Spielstand zu aktualisieren
CREATE POLICY "Allow users to update their own game state"
    ON bart_clicker_game_state FOR UPDATE
    USING (true);

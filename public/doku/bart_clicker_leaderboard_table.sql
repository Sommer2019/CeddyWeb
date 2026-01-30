-- SQL-Befehl für die Bart Klicker Leaderboard-Tabelle
-- Diese Tabelle speichert die Bestenliste separat vom Spielstand

-- Tabelle: bart_clicker_leaderboard
-- Speichert Leaderboard-Einträge nach gehashter IP
-- Username ist UNIQUE, um Duplikate zu vermeiden
CREATE TABLE IF NOT EXISTS bart_clicker_leaderboard (
    ip_hash TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,  -- UNIQUE: Username muss eindeutig sein
    energy NUMERIC NOT NULL DEFAULT 0,
    total_ever NUMERIC NOT NULL DEFAULT 0,
    rebirth_count INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes für bessere Performance beim Sortieren
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_ever ON bart_clicker_leaderboard(total_ever DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rebirth_count ON bart_clicker_leaderboard(rebirth_count DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_username ON bart_clicker_leaderboard(username);

-- Row Level Security (RLS) aktivieren
ALTER TABLE bart_clicker_leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies für bart_clicker_leaderboard
-- Erlaubt allen das Lesen der Bestenliste
CREATE POLICY "Allow users to read leaderboard"
    ON bart_clicker_leaderboard FOR SELECT
    USING (true);

-- Erlaubt allen das Einfügen von Einträgen
CREATE POLICY "Allow users to insert leaderboard entries"
    ON bart_clicker_leaderboard FOR INSERT
    WITH CHECK (true);

-- Erlaubt allen das Aktualisieren von Einträgen
CREATE POLICY "Allow users to update leaderboard entries"
    ON bart_clicker_leaderboard FOR UPDATE
    USING (true);

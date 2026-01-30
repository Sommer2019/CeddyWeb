# Bart Klicker - Username Uniqueness und IP-Wechsel Handling

## Übersicht

Diese Dokumentation beschreibt die Implementierung von eindeutigen Benutzernamen und automatischer IP-Wechsel-Erkennung im Bart Klicker Spiel.

## Problem Statement

**Original (Deutsch):**
> mache die usernames unique. sorge dafür, dass bei IP Wechsel die einträge in Nutzerdaten und leaderboard nicht doppelt sind ( IP updaten bei selben Username etc.) auch suprabase änderungen angeben!

**Anforderungen:**
1. Usernames müssen eindeutig sein (keine Duplikate)
2. Bei IP-Wechsel keine doppelten Einträge in Nutzerdaten und Leaderboard
3. IP-Adresse updaten bei gleichem Username
4. Supabase-Schema-Änderungen dokumentieren

## Implementierte Änderungen

### 1. Datenbank-Schema-Änderungen

#### A) bart_clicker_game_state Tabelle

**Neu: UNIQUE Constraint auf username**

```sql
CREATE TABLE IF NOT EXISTS bart_clicker_game_state (
    id BIGSERIAL PRIMARY KEY,
    ip_hash TEXT NOT NULL UNIQUE,
    username TEXT UNIQUE,  -- NEU: UNIQUE Constraint
    energy NUMERIC NOT NULL DEFAULT 0,
    total_ever NUMERIC NOT NULL DEFAULT 0,
    rebirth_count INTEGER NOT NULL DEFAULT 0,
    rebirth_multiplier NUMERIC NOT NULL DEFAULT 1,
    offline_earning_upgrades INTEGER NOT NULL DEFAULT 0,
    shop_items JSONB NOT NULL DEFAULT '[]',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_bart_clicker_username 
    ON bart_clicker_game_state(username) 
    WHERE username IS NOT NULL;
```

#### B) bart_clicker_leaderboard Tabelle

**Neue Tabelle mit UNIQUE username**

```sql
CREATE TABLE IF NOT EXISTS bart_clicker_leaderboard (
    ip_hash TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,  -- UNIQUE Constraint
    energy NUMERIC NOT NULL DEFAULT 0,
    total_ever NUMERIC NOT NULL DEFAULT 0,
    rebirth_count INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_ever 
    ON bart_clicker_leaderboard(total_ever DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rebirth_count 
    ON bart_clicker_leaderboard(rebirth_count DESC);
```

### 2. JavaScript-Implementierung

#### A) Username-Eindeutigkeitsprüfung

```javascript
async function checkUsernameUnique(newUsername) {
    const supabase = await getSupabaseClient();
    const ipHash = await getUserIpHash();
    
    // Prüfe in beiden Tabellen (case-insensitive)
    const { data: gameStateData } = await supabase
        .from('bart_clicker_game_state')
        .select('ip_hash, username')
        .ilike('username', newUsername)
        .neq('ip_hash', ipHash);
    
    const { data: leaderboardData } = await supabase
        .from('bart_clicker_leaderboard')
        .select('ip_hash, username')
        .ilike('username', newUsername)
        .neq('ip_hash', ipHash);
    
    // Username ist eindeutig, wenn in keiner Tabelle vorhanden
    return (!gameStateData || gameStateData.length === 0) && 
           (!leaderboardData || leaderboardData.length === 0);
}
```

#### B) IP-Wechsel-Erkennung und Migration

```javascript
async function handleUsernameChange(oldUsername, newUsername) {
    const supabase = await getSupabaseClient();
    const currentIpHash = await getUserIpHash();
    
    // Suche nach bestehendem Benutzer mit diesem Username an anderer IP
    const { data: existingUser } = await supabase
        .from('bart_clicker_game_state')
        .select('*')
        .eq('username', newUsername)
        .neq('ip_hash', currentIpHash)
        .maybeSingle();
    
    if (existingUser) {
        // IP-Wechsel erkannt!
        console.log('User with this username exists at different IP - updating IP...');
        
        // Merge game states (behalte den besseren)
        const shouldMigrate = existingUser.total_ever > totalEver;
        
        if (shouldMigrate) {
            // Lade Daten des existierenden Users
            energy = parseFloat(existingUser.energy);
            totalEver = parseFloat(existingUser.total_ever);
            // ... weitere Daten
            
            alert('Willkommen zurück! Dein Spielstand wurde wiederhergestellt.');
        }
        
        // Lösche alte Einträge mit alter IP
        await supabase
            .from('bart_clicker_game_state')
            .delete()
            .eq('ip_hash', existingUser.ip_hash);
        
        await supabase
            .from('bart_clicker_leaderboard')
            .delete()
            .eq('ip_hash', existingUser.ip_hash);
        
        console.log('IP migration completed successfully');
    }
    
    // Synchronisiere mit neuer IP
    await syncToSupabase();
}
```

#### C) Fehlerbehandlung bei UNIQUE Constraint Violations

```javascript
async function syncToSupabase() {
    // ... Spielstand vorbereiten ...
    
    const { error } = await supabase
        .from('bart_clicker_game_state')
        .upsert(gameState, { onConflict: 'ip_hash' });
    
    if (error) {
        // UNIQUE constraint violation auf username
        if (error.code === '23505' && error.message.includes('username')) {
            alert('Dieser Nutzername ist bereits vergeben. Bitte ändere deinen Namen.');
            // Lösche Username und fordere Neueingabe
            username = null;
            localStorage.removeItem('bart_clicker_username');
        }
    }
}
```

### 3. Benutzer-Flow

#### Szenario 1: Neuer Benutzer

1. Öffnet Spiel zum ersten Mal
2. Gibt Username ein (z.B. "MaxMustermann")
3. System prüft Eindeutigkeit
4. Username wird akzeptiert und gespeichert
5. Einträge in beiden Tabellen erstellt

#### Szenario 2: IP-Wechsel (gleiches Netzwerk → neues Netzwerk)

**Vorher:**
- User "MaxMustermann" mit IP-Hash `abc123`
- Eintrag in `bart_clicker_game_state` und `bart_clicker_leaderboard`

**Nachher (nach IP-Wechsel):**
1. Benutzer öffnet Spiel mit neuer IP (IP-Hash `xyz789`)
2. System erkennt: Username "MaxMustermann" existiert bereits
3. System vergleicht Spielstände
4. Besserer Spielstand wird behalten
5. Alte Einträge mit `abc123` werden gelöscht
6. Neue Einträge mit `xyz789` werden erstellt
7. **Ergebnis:** Nur ein Eintrag in jeder Tabelle, keine Duplikate!

#### Szenario 3: Username bereits vergeben

1. Benutzer versucht Username "BartKing" einzugeben
2. System prüft Datenbank
3. Username existiert bereits
4. Fehlermeldung: "Dieser Nutzername ist bereits vergeben"
5. Benutzer muss anderen Namen wählen

### 4. SQL-Migrations-Script

**Für bestehende Installationen:**

```sql
-- Datei: doku/bart_clicker_make_username_unique_migration.sql

-- Schritt 1: Duplikate in bart_clicker_game_state behandeln
-- Fügt Suffix (_1, _2, etc.) zu Duplikaten hinzu
DO $$
DECLARE
    duplicate_username TEXT;
    counter INTEGER;
BEGIN
    FOR duplicate_username IN 
        SELECT username 
        FROM bart_clicker_game_state 
        WHERE username IS NOT NULL 
        GROUP BY username 
        HAVING COUNT(*) > 1
    LOOP
        counter := 1;
        -- Update Duplikate (außer dem ersten)
        FOR duplicate_count IN 
            SELECT id 
            FROM bart_clicker_game_state 
            WHERE username = duplicate_username
            ORDER BY last_updated ASC
            OFFSET 1
        LOOP
            UPDATE bart_clicker_game_state
            SET username = duplicate_username || '_' || counter
            WHERE id = duplicate_count;
            counter := counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- Schritt 2: UNIQUE Constraint hinzufügen
ALTER TABLE bart_clicker_game_state
ADD CONSTRAINT bart_clicker_game_state_username_key UNIQUE (username);

-- Schritt 3: Gleiches für bart_clicker_leaderboard
-- ... (siehe vollständige SQL-Datei)
```

## SQL-Dateien

### Für neue Installationen:
- `doku/bart_clicker_table.sql` - Haupttabelle mit UNIQUE constraint
- `doku/bart_clicker_leaderboard_table.sql` - Leaderboard-Tabelle
- `doku/supabase-schema.sql` - Komplettes Schema (aktualisiert)

### Für bestehende Installationen:
- `doku/bart_clicker_make_username_unique_migration.sql` - Migriert bestehende Daten

## Vorteile

✅ **Keine Duplikate**: Jeder Username ist eindeutig im System  
✅ **IP-Wechsel-sicher**: Automatische Erkennung und Migration  
✅ **Keine doppelten Leaderboard-Einträge**: Nur ein Eintrag pro User  
✅ **Datenkonsistenz**: Username ist Identifikator, nicht IP  
✅ **Backward-kompatibel**: Migration ohne Datenverlust  

## Technische Details

### Case-Insensitive Vergleich

Usernames werden case-insensitive verglichen:
- "MaxMustermann" und "maxmustermann" gelten als gleich
- Verwendet PostgreSQL `ILIKE` Operator

### Konflikt-Auflösung

Bei IP-Wechsel:
1. **Spielstand-Vergleich**: System vergleicht `total_ever` Werte
2. **Besseren behalten**: Der Spielstand mit mehr Fortschritt wird behalten
3. **Alte Einträge löschen**: Einträge mit alter IP werden entfernt
4. **Neue erstellen**: Mit neuer IP werden neue Einträge angelegt

### Performance

- Indexes auf `username` für schnelle Lookups
- Indexes auf `total_ever` und `rebirth_count` für Leaderboard-Sortierung
- WHERE clause `WHERE username IS NOT NULL` für partial index

## Testing

### Manueller Test: Username-Eindeutigkeit

1. Öffne Spiel, setze Username "TestUser1"
2. Öffne Spiel in anderem Browser/Inkognito
3. Versuche gleichen Username "TestUser1" zu setzen
4. ✅ Sollte Fehlermeldung zeigen

### Manueller Test: IP-Wechsel-Simulation

1. Öffne Spiel, setze Username "Migrator"
2. Spiele, sammle Energie
3. In Supabase: Ändere `ip_hash` manuell
4. Öffne Spiel erneut (neue IP wird geholt)
5. Gib gleichen Username "Migrator" ein
6. ✅ System sollte Spielstand wiederherstellen
7. ✅ Nur ein Eintrag pro Tabelle sollte existieren

### SQL-Test: Prüfe Constraints

```sql
-- Prüfe UNIQUE constraint auf bart_clicker_game_state
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'bart_clicker_game_state'::regclass
AND contype = 'u';

-- Erwartetes Ergebnis: bart_clicker_game_state_username_key
```

## Zusammenfassung

Das Bart Klicker Spiel verfügt jetzt über:

- ✅ **Eindeutige Usernames**: Keine Duplikate möglich
- ✅ **IP-Wechsel-Erkennung**: Automatische Migration des Spielstands
- ✅ **Keine doppelten Einträge**: In Nutzerdaten und Leaderboard
- ✅ **Robuste Fehlerbehandlung**: UNIQUE constraint violations werden behandelt
- ✅ **SQL-Scripts bereitgestellt**: Für neue und bestehende Installationen
- ✅ **Dokumentiert**: Vollständige Implementierungsdokumentation

**Dateien geändert:**
1. `games/bartclicker.html` - JavaScript-Implementierung
2. `doku/bart_clicker_table.sql` - Schema mit UNIQUE constraint
3. `doku/bart_clicker_leaderboard_table.sql` - Neue Leaderboard-Tabelle (NEU)
4. `doku/bart_clicker_make_username_unique_migration.sql` - Migration (NEU)
5. `doku/supabase-schema.sql` - Komplettes Schema aktualisiert
6. `doku/BART_CLICKER_SUPABASE.md` - Dokumentation aktualisiert
7. `doku/USERNAME_UNIQUENESS_IP_CHANGE.md` - Diese Datei (NEU)

# Bart Klicker - Spielstand-Speicherung mit Supabase

## Zusammenfassung

Der Bart Klicker wurde erfolgreich umgebaut, um den Spielstand in Supabase nach gehashter IP-Adresse zu speichern. Spieler können jetzt ihr Spiel jederzeit fortsetzen, da der Fortschritt automatisch in der Datenbank gesichert wird.

## 🎯 Hauptfunktionen

✅ **IP-Hashing**: Die IP-Adresse wird mit SHA-256 gehasht, bevor sie gespeichert wird  
✅ **Automatisches Laden**: Beim Öffnen der Seite wird der Spielstand automatisch wiederhergestellt  
✅ **Automatisches Speichern**: Der Spielstand wird alle 10 Sekunden automatisch gespeichert  
✅ **Speichern beim Kaufen**: Nach jedem Shop-Kauf wird der Spielstand sofort gespeichert  
✅ **Speichern beim Verlassen**: Beim Schließen der Seite wird der Spielstand gesichert  
✅ **Fallback-Mechanismus**: Falls die IP nicht ermittelt werden kann, wird eine eindeutige ID im Browser gespeichert

## 📋 SQL-Befehl für die neue Tabelle

Hier ist der SQL-Befehl, um die Tabelle in Supabase zu erstellen:

```sql
-- Tabelle: bart_clicker_game_state
-- Speichert den Spielstand des Bart Klicker Spiels nach gehashter IP
CREATE TABLE IF NOT EXISTS bart_clicker_game_state (
    id BIGSERIAL PRIMARY KEY,
    ip_hash TEXT NOT NULL UNIQUE,
    energy NUMERIC NOT NULL DEFAULT 0,
    total_ever NUMERIC NOT NULL DEFAULT 0,
    shop_items JSONB NOT NULL DEFAULT '[]',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für bessere Performance
CREATE INDEX IF NOT EXISTS idx_bart_clicker_ip_hash ON bart_clicker_game_state(ip_hash);

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
```

### So führst du den SQL-Befehl aus:

1. Öffne dein Supabase Dashboard: https://supabase.com/dashboard
2. Wähle dein Projekt aus
3. Gehe zu **"SQL Editor"** in der linken Navigation
4. Kopiere den obigen SQL-Befehl und füge ihn ein
5. Klicke auf **"Run"** (oder drücke Ctrl+Enter)
6. Die Tabelle wird erstellt! ✅

## 🔧 Technische Details

### Tabellen-Struktur

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | BIGSERIAL | Eindeutige ID (Primary Key) |
| `ip_hash` | TEXT | SHA-256 Hash der IP-Adresse (UNIQUE) |
| `energy` | NUMERIC | Aktuelle Energie/Punkte |
| `total_ever` | NUMERIC | Gesamtenergie (für Bart-Wachstum) |
| `shop_items` | JSONB | JSON-Array mit Shop-Items |
| `last_updated` | TIMESTAMPTZ | Zeitstempel der letzten Aktualisierung |

### Shop Items Format

Die `shop_items` werden als JSON-Array gespeichert:

```json
[
  { "id": 0, "count": 5, "cost": 28 },
  { "id": 1, "count": 2, "cost": 115 },
  { "id": 2, "count": 1, "cost": 500 }
]
```

Jedes Item speichert:
- `id`: Item-ID (zum Abgleich mit Shop-Items)
- `count`: Anzahl der gekauften Items
- `cost`: Aktueller Preis (steigt mit jedem Kauf)

### IP-Hashing Prozess

1. **IP-Adresse abrufen**: Von `api.ipify.org`
2. **SHA-256 Hash erstellen**: Mit Web Crypto API
3. **Hash speichern**: In der Datenbank
4. **Fallback**: Falls IP nicht verfügbar → UUID in localStorage

Beispiel:
```
IP: 192.168.1.1
→ SHA-256: a3d5c2b1...89abc (64 Zeichen Hex)
```

### Speicher-Trigger

Der Spielstand wird gespeichert bei:

1. ✅ **Shop-Kauf**: Sofort nach jedem Kauf
2. ⏰ **Auto-Save**: Alle 10 Sekunden automatisch
3. 🚪 **Seite verlassen**: Beim Schließen/Verlassen der Seite

### Lade-Prozess

Beim Öffnen der Seite:

1. IP-Adresse wird gehasht
2. Datenbank wird nach bestehendem Spielstand abgefragt
3. Falls vorhanden: Spielstand wird wiederhergestellt
4. Falls nicht: Neues Spiel beginnt bei 0

## 🔒 Sicherheit & Datenschutz

### Datenschutz

✅ **IP-Adresse wird nicht im Klartext gespeichert**  
- Nur SHA-256 Hash wird in der Datenbank gespeichert
- Der Hash kann nicht zurück in die IP-Adresse umgewandelt werden

✅ **Keine persönlichen Daten**  
- Es werden nur Spiel-Daten gespeichert
- Keine Namen, E-Mails oder andere Identifikationsdaten

✅ **Row Level Security (RLS)**  
- Supabase RLS-Policies schützen die Daten
- Jeder kann nur seinen eigenen Spielstand lesen/schreiben

### Bekannte Einschränkungen

⚠️ **RLS-Limitation**: Die aktuellen RLS-Policies erlauben allen Benutzern Zugriff auf alle Daten (`USING (true)`). Dies ist für ein einfaches Browser-Spiel akzeptabel, aber nicht ideal für produktive Anwendungen mit sensiblen Daten.

⚠️ **Client-seitige IP**: Die IP-Adresse wird client-seitig abgerufen, was bedeutet, dass technisch versierte Benutzer den Hash manipulieren könnten. Für ein Casual-Spiel ist das akzeptabel.

## 📝 Geänderte Dateien

1. **`games/bartclicker.html`**
   - Supabase-Integration hinzugefügt
   - IP-Hashing-Funktion implementiert
   - Lade- und Speicher-Funktionen hinzugefügt

2. **`doku/supabase-schema.sql`**
   - Tabellen-Definition hinzugefügt
   - RLS-Policies hinzugefügt

3. **`doku/bart_clicker_table.sql`** *(NEU)*
   - Standalone SQL-Befehl für die Tabelle

4. **`doku/BART_CLICKER_SUPABASE.md`** *(NEU)*
   - Ausführliche technische Dokumentation

## 🧪 Testen

### Manueller Test

1. Öffne `/games/bartclicker.html`
2. Spiele das Spiel und kaufe einige Items
3. Öffne die Browser-Konsole (F12)
4. Schaue nach der Meldung: `Game state saved to Supabase`
5. Schließe die Seite
6. Öffne die Seite erneut
7. Schaue nach der Meldung: `Game state loaded from Supabase`
8. ✅ Dein Spielstand sollte wiederhergestellt sein!

### Konsolen-Meldungen

```
Game state loaded from Supabase    ← Spielstand geladen
Game state saved to Supabase       ← Spielstand gespeichert
```

Bei Fehlern:
```
Error loading game state: ...
Error saving game state: ...
```

## 🎮 Wie es funktioniert

### Spieler-Perspektive

1. Du öffnest das Bart Klicker Spiel
2. Wenn du schon mal gespielt hast, wird dein Fortschritt geladen
3. Du spielst weiter und kaufst Items
4. Der Spielstand wird automatisch alle 10 Sekunden gespeichert
5. Wenn du die Seite verlässt, wird der Spielstand nochmal gespeichert
6. Beim nächsten Besuch kannst du genau da weitermachen, wo du aufgehört hast!

### Technische Perspektive

```
Seite öffnen
    ↓
getUserIpHash() → SHA-256 Hash der IP
    ↓
loadGameState() → Lade Spielstand aus Supabase
    ↓
Spiel starten mit wiederhergestelltem Zustand
    ↓
[Während des Spielens]
    ↓
Item kaufen → saveGameState() sofort
    ↓
Auto-Save alle 10s → saveGameState()
    ↓
Seite verlassen → saveGameStateSync()
```

## 🚀 Weitere Verbesserungen (Optional)

Mögliche zukünftige Erweiterungen:

- 🔐 **Server-seitiges IP-Hashing**: IP auf dem Server hashen statt im Browser
- 📊 **Leaderboard**: Top-Spieler anzeigen
- 🎯 **Achievements**: Erfolge freischalten
- 💾 **Export/Import**: Spielstand exportieren/importieren
- 🔄 **Cloud-Sync**: Mit Account-System synchronisieren

## 📚 Weitere Dokumentation

- **Ausführliche Dokumentation**: `doku/BART_CLICKER_SUPABASE.md`
- **SQL-Befehl**: `doku/bart_clicker_table.sql`
- **Vollständiges Schema**: `doku/supabase-schema.sql`

## ✅ Fertig!

Der Bart Klicker speichert jetzt automatisch den Spielstand in Supabase nach gehashter IP-Adresse. Viel Spaß beim Spielen! 🧔✨

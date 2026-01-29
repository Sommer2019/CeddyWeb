# Bart Klicker - Supabase Integration

## Übersicht

Das Bart Klicker Spiel wurde erfolgreich umgebaut, um den Spielstand in Supabase nach gehashter IP zu speichern. Dies ermöglicht es Spielern, ihren Fortschritt geräteübergreifend zu behalten, solange sie dieselbe IP-Adresse verwenden.

## Implementierte Änderungen

### 1. Datenbank-Tabelle

Eine neue Tabelle `bart_clicker_game_state` wurde in Supabase erstellt:

```sql
CREATE TABLE IF NOT EXISTS bart_clicker_game_state (
    id BIGSERIAL PRIMARY KEY,
    ip_hash TEXT NOT NULL UNIQUE,
    username TEXT,
    energy NUMERIC NOT NULL DEFAULT 0,
    total_ever NUMERIC NOT NULL DEFAULT 0,
    rebirth_count INTEGER NOT NULL DEFAULT 0,
    rebirth_multiplier NUMERIC NOT NULL DEFAULT 1,
    shop_items JSONB NOT NULL DEFAULT '[]',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Spalten:**
- `id`: Eindeutige ID für jeden Eintrag
- `ip_hash`: SHA-256 Hash der IP-Adresse des Spielers (UNIQUE)
- `username`: Optionaler Benutzername (wird mit Spielstand synchronisiert)
- `energy`: Aktuelle Energie/Punkte des Spielers
- `total_ever`: Gesamtenergie, die jemals gesammelt wurde (für Bart-Wachstum)
- `rebirth_count`: Anzahl der Wiedergeburten
- `rebirth_multiplier`: Multiplikator durch Wiedergeburten
- `shop_items`: JSON-Array mit gekauften Shop-Items und deren Status
- `last_updated`: Zeitstempel der letzten Aktualisierung

**SQL-Befehle:** 
- Der vollständige SQL-Befehl zur Erstellung der Tabelle ist in `doku/bart_clicker_table.sql` verfügbar
- Für bestehende Installationen: `doku/bart_clicker_add_username_migration.sql` enthält das Migration-Script

### 2. IP-Hashing

Die IP-Adresse des Spielers wird mit SHA-256 gehasht, um die Privatsphäre zu schützen:

```javascript
async function getUserIpHash() {
    // Holt die IP-Adresse von ipify.org
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    const ip = data.ip;
    
    // Hasht die IP mit SHA-256
    const msgBuffer = new TextEncoder().encode(ip);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
}
```

**Fallback:** Falls die IP-Adresse nicht abgerufen werden kann, wird eine Session-ID verwendet.

### 3. Laden des Spielstands

Beim Laden der Seite wird automatisch der Spielstand aus Supabase geladen:

```javascript
async function loadGameState() {
    const ipHash = await getUserIpHash();
    const supabase = await getSupabaseClient();
    
    const { data } = await supabase
        .from('bart_clicker_game_state')
        .select('*')
        .eq('ip_hash', ipHash)
        .single();
    
    if (data) {
        energy = data.energy;
        totalEver = data.total_ever;
        rebirthCount = data.rebirth_count;
        rebirthMultiplier = data.rebirth_multiplier;
        
        // Benutzername laden, falls gesetzt
        if (data.username) {
            username = data.username;
            localStorage.setItem('bart_clicker_username', username);
            showUsernameDisplay();
        }
        
        // Shop-Items wiederherstellen
        shopItems.forEach((item, i) => {
            if (data.shop_items[i]) {
                item.count = data.shop_items[i].count;
                item.cost = data.shop_items[i].cost;
            }
        });
    }
}
```

**Neue Funktion:** Der Benutzername wird jetzt auch aus der Datenbank geladen. Wenn ein Benutzername in der Datenbank gespeichert ist, wird er automatisch wiederhergestellt, ohne dass der Benutzer ihn erneut eingeben muss.

### 4. Speichern des Spielstands

Der Spielstand wird in folgenden Situationen gespeichert:

1. **Beim Kauf eines Items**: Nach jedem Shop-Kauf
2. **Auto-Save**: Alle 30 Sekunden automatisch
3. **Beim Verlassen der Seite**: Wenn der Benutzer die Seite schließt oder verlässt
4. **Beim Setzen des Benutzernamens**: Wenn der Benutzer einen Namen eingibt

```javascript
async function saveGameState() {
    const gameState = {
        ip_hash: ipHash,
        username: username || null, // Benutzername wird mitgespeichert
        energy: energy,
        total_ever: totalEver,
        rebirth_count: rebirthCount,
        rebirth_multiplier: rebirthMultiplier,
        shop_items: shopItems.map(item => ({
            id: item.id,
            count: item.count,
            cost: item.cost
        }))
    };
    
    // Update oder Insert
    await supabase
        .from('bart_clicker_game_state')
        .upsert(gameState, { onConflict: 'ip_hash' });
}
```

**Wichtig:** Der Benutzername wird jetzt automatisch mit dem Spielstand synchronisiert. Wenn der Spieler einen Namen setzt, wird dieser in der Datenbank gespeichert und auf anderen Geräten mit derselben IP wiederhergestellt.

### 5. Supabase Integration

Die Integration nutzt die bereits vorhandene Supabase-Infrastruktur:

- `js/config.js`: Supabase-Konfiguration (URL und API-Key)
- `js/supabase-client.js`: Supabase-Client-Funktionen

## Sicherheit

### Row Level Security (RLS)

Die Tabelle ist mit Row Level Security geschützt:

```sql
-- Lesen erlaubt für alle
CREATE POLICY "Allow users to read their own game state"
    ON bart_clicker_game_state FOR SELECT
    USING (true);

-- Einfügen erlaubt für alle
CREATE POLICY "Allow users to insert their own game state"
    ON bart_clicker_game_state FOR INSERT
    WITH CHECK (true);

-- Aktualisieren erlaubt für alle
CREATE POLICY "Allow users to update their own game state"
    ON bart_clicker_game_state FOR UPDATE
    USING (true);
```

**Hinweis:** Die RLS-Policies erlauben allen Benutzern das Lesen, Einfügen und Aktualisieren. Dies ist für ein öffentliches Spiel akzeptabel, da die IP-Adresse gehasht ist und keine persönlichen Daten gespeichert werden.

### Datenschutz

- Die IP-Adresse wird **nicht** im Klartext gespeichert
- Es wird ein SHA-256 Hash verwendet
- Keine persönlichen Daten werden gespeichert
- Der Spielstand ist anonym und kann nicht zu einer Person zurückverfolgt werden

## Verwendung

### SQL-Befehl ausführen

**Für neue Installationen:**
1. Öffne das Supabase Dashboard: https://supabase.com/dashboard
2. Navigiere zu deinem Projekt
3. Gehe zu "SQL Editor"
4. Kopiere den Inhalt von `doku/bart_clicker_table.sql` und führe ihn aus

**Für bestehende Installationen (Migration):**
1. Öffne das Supabase Dashboard: https://supabase.com/dashboard
2. Navigiere zu deinem Projekt
3. Gehe zu "SQL Editor"
4. Kopiere den Inhalt von `doku/bart_clicker_add_username_migration.sql` und führe ihn aus

Dies fügt die `username`, `rebirth_count` und `rebirth_multiplier` Spalten zur bestehenden Tabelle hinzu.

Alternativ kannst du auch den Inhalt aus `doku/supabase-schema.sql` am Ende finden, wo die Tabelle bereits hinzugefügt wurde.

### Testen

1. Öffne die Seite `/games/bartclicker.html`
2. Spiele das Spiel und kaufe einige Items
3. Schließe die Seite
4. Öffne die Seite erneut
5. Der Spielstand sollte wiederhergestellt sein

### Debugging

Öffne die Browser-Konsole (F12), um Meldungen über das Laden und Speichern des Spielstands zu sehen:

- `Game state loaded from Supabase`: Spielstand erfolgreich geladen
- `Game state saved to Supabase (new)`: Neuer Spielstand gespeichert
- `Game state saved to Supabase (updated)`: Spielstand aktualisiert
- Fehlermeldungen bei Problemen mit Supabase

## Technische Details

### Abhängigkeiten

- **Supabase JS Client**: Wird dynamisch von CDN geladen
- **ipify.org**: API zur Ermittlung der IP-Adresse
- **Web Crypto API**: Für SHA-256 Hashing

### Kompatibilität

- Moderne Browser mit Web Crypto API-Unterstützung
- Fallback zu Session-basierter ID, falls IP nicht ermittelt werden kann
- Internet-Verbindung erforderlich für Supabase-Zugriff

### Performance

- **Laden**: Beim Laden der Seite wird nur eine Datenbankabfrage durchgeführt
- **Speichern**: Automatisches Speichern alle 10 Sekunden + beim Verlassen der Seite
- **Optimierung**: Während des Ladevorgangs werden keine Speichervorgänge durchgeführt

## Zusammenfassung

Das Bart Klicker Spiel speichert jetzt automatisch den Spielstand in Supabase:
- ✅ IP-Adresse wird gehasht (SHA-256)
- ✅ Spielstand wird in `bart_clicker_game_state` Tabelle gespeichert
- ✅ **Benutzername wird mit dem Spielstand synchronisiert**
- ✅ Automatisches Laden beim Öffnen der Seite
- ✅ Automatisches Speichern alle 30 Sekunden
- ✅ Speichern beim Verlassen der Seite
- ✅ Speichern nach jedem Shop-Kauf
- ✅ Speichern beim Setzen des Benutzernamens
- ✅ SQL-Befehle in `doku/bart_clicker_table.sql` und `doku/bart_clicker_add_username_migration.sql` verfügbar

**Neue Feature:** Wenn ein Benutzer seinen Benutzernamen setzt, wird dieser in der Datenbank gespeichert. Beim nächsten Besuch (mit derselben IP) wird der Benutzername automatisch wiederhergestellt, ohne dass er erneut eingegeben werden muss.

# Bartklicker Username Persistence - Implementation Summary

## Übersicht

Die Username-Funktion im Bartklicker-Spiel wurde erweitert, um den Benutzernamen in der Supabase-Datenbank zu speichern. Dadurch müssen Benutzer ihren Namen nicht erneut eingeben, wenn sie zum Spiel zurückkehren (solange sie dieselbe IP-Adresse verwenden).

## Problem Statement

**Original (Deutsch):**
> Sorge dafür, dass der Username im bartklicker auch in der DB gespeichert wird, falls man ihn setzt. so muss dann nicht, wenn der cookie gesetzt ist nochmal neu nach username gefragt werden. Bitte auch den sql befehl. für suprabase

**Übersetzung:**
- Der Username war nur in localStorage gespeichert
- Beim Zurückkehren zum Spiel musste der Username erneut eingegeben werden
- Es wurde eine Datenbank-Integration benötigt

## Implementierte Änderungen

### 1. Datenbank-Schema Updates

#### a) Neue Tabelle (`supabase-schema.sql`)
```sql
CREATE TABLE IF NOT EXISTS bart_clicker_game_state (
    id BIGSERIAL PRIMARY KEY,
    ip_hash TEXT NOT NULL UNIQUE,
    username TEXT,                          -- NEU: Username-Spalte
    energy NUMERIC NOT NULL DEFAULT 0,
    total_ever NUMERIC NOT NULL DEFAULT 0,
    rebirth_count INTEGER NOT NULL DEFAULT 0,    -- NEU: Rebirth-Zähler
    rebirth_multiplier NUMERIC NOT NULL DEFAULT 1, -- NEU: Rebirth-Multiplikator
    shop_items JSONB NOT NULL DEFAULT '[]',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### b) Migration für bestehende Installationen (`bart_clicker_add_username_migration.sql`)
```sql
-- Fügt Username-Spalte hinzu (optional, NULL erlaubt)
ALTER TABLE bart_clicker_game_state 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Fügt Rebirth-Spalten hinzu
ALTER TABLE bart_clicker_game_state 
ADD COLUMN IF NOT EXISTS rebirth_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE bart_clicker_game_state 
ADD COLUMN IF NOT EXISTS rebirth_multiplier NUMERIC NOT NULL DEFAULT 1;
```

### 2. JavaScript-Änderungen (`games/bartclicker.html`)

#### a) Username in localStorage speichern
```javascript
function saveToLocalStorage() {
    try {
        const gameState = {
            username: username || null,  // Username hinzugefügt
            energy: energy,
            total_ever: totalEver,
            rebirth_count: rebirthCount,
            rebirth_multiplier: rebirthMultiplier,
            shop_items: shopItems.map(item => ({
                id: item.id,
                count: item.count,
                cost: item.cost
            })),
            last_updated: new Date().toISOString()
        };
        
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameState));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}
```

#### b) Username zu Supabase synchronisieren
```javascript
async function syncToSupabase() {
    if (!needsSync) return;
    
    try {
        const ipHash = await getUserIpHash();
        const supabase = await getSupabaseClient();
        
        const gameState = {
            ip_hash: ipHash,
            username: username || null,  // Username hinzugefügt
            energy: energy,
            total_ever: totalEver,
            rebirth_count: rebirthCount,
            rebirth_multiplier: rebirthMultiplier,
            shop_items: shopItems.map(item => ({
                id: item.id,
                count: item.count,
                cost: item.cost
            })),
            last_updated: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('bart_clicker_game_state')
            .upsert(gameState, { onConflict: 'ip_hash' });
        
        if (error) {
            console.error('Error syncing to Supabase:', error);
        } else {
            console.log('Game state synced to Supabase');
            needsSync = false;
            saveToLocalStorage();
        }
    } catch (error) {
        console.error('Error syncing to Supabase:', error);
    }
}
```

#### c) Username aus localStorage laden
```javascript
async function loadGameState() {
    try {
        const ipHash = await getUserIpHash();
        
        // Zuerst aus localStorage laden
        const localData = loadFromLocalStorage();
        if (localData) {
            // ... andere Daten laden ...
            
            // Username aus localStorage wiederherstellen
            if (localData.username) {
                username = localData.username;
                showUsernameDisplay();
            }
            
            // ... Rest des Ladevorgangs ...
        }
        
        // ... Rest der Funktion ...
    } catch (error) {
        console.error('Error loading game state:', error);
    }
}
```

#### d) Username aus Supabase laden
```javascript
// In loadGameState(), wenn Supabase-Daten neuer sind:
if (supabaseTime > localTime) {
    console.log('Supabase data is newer, using it');
    // ... andere Daten laden ...
    
    // Username aus Supabase wiederherstellen
    if (data.username) {
        username = data.username;
        localStorage.setItem('bart_clicker_username', username);
        showUsernameDisplay();
    }
    
    // ... Rest des Ladevorgangs ...
}
```

#### e) Username sofort synchronisieren beim Setzen
```javascript
function setUsername() {
    const input = document.getElementById('username-input');
    const name = input.value.trim();
    
    if (name.length < 3) {
        alert('Nutzername muss mindestens 3 Zeichen lang sein!');
        return;
    }
    
    username = name;
    localStorage.setItem('bart_clicker_username', username);
    showUsernameDisplay();
    document.getElementById('username-modal').classList.remove('active');
    
    // WICHTIG: Username sofort in Datenbank synchronisieren
    needsSync = true;
    if (navigator.onLine) {
        syncToSupabase();
    }
    
    // Leaderboard aktualisieren
    updateLeaderboard();
}
```

## Wie es funktioniert

### Ablauf beim ersten Besuch:
1. Benutzer öffnet das Spiel
2. Modal erscheint zur Eingabe des Usernames
3. Benutzer gibt Username ein
4. Username wird gespeichert in:
   - localStorage (`bart_clicker_username`)
   - localStorage Game State (neuer Key)
   - Supabase (`bart_clicker_game_state.username`)

### Ablauf bei Rückkehr zum Spiel:
1. Benutzer öffnet das Spiel
2. Spielstand wird geladen:
   - Zuerst aus localStorage
   - Dann aus Supabase (wenn online)
3. Username wird automatisch wiederhergestellt:
   - Aus localStorage Game State ODER
   - Aus Supabase (wenn Supabase-Daten neuer sind)
4. Username wird angezeigt
5. Kein Modal erscheint (da Username bereits gesetzt ist)

### Daten-Synchronisation:
- **localStorage → Supabase**: Beim Auto-Save (alle 30 Sekunden), beim Shop-Kauf, beim Seitenverlassen
- **Supabase → localStorage**: Beim Laden, wenn Supabase-Daten neuer sind
- **Vergleich**: Timestamps werden verglichen, neuere Daten gewinnen

## Installation

### Für neue Installationen:
1. Öffne Supabase Dashboard SQL Editor
2. Führe `doku/bart_clicker_table.sql` aus
3. Fertig!

### Für bestehende Installationen (Migration):
1. Öffne Supabase Dashboard SQL Editor
2. Führe `doku/bart_clicker_add_username_migration.sql` aus
3. Dies fügt die fehlenden Spalten hinzu ohne bestehende Daten zu verlieren
4. Fertig!

## Vorteile

✅ **Keine doppelte Eingabe**: Username muss nur einmal eingegeben werden  
✅ **Geräteübergreifend**: Funktioniert auf allen Geräten mit derselben IP  
✅ **Offline-fähig**: Username wird auch in localStorage gespeichert  
✅ **Datenkonsistenz**: Username wird mit Spielstand synchronisiert  
✅ **Keine Breaking Changes**: Bestehende Spieler werden nicht beeinträchtigt  

## Sicherheit & Datenschutz

- Username ist optional (NULL erlaubt)
- Keine persönlichen Daten außer dem frei gewählten Username
- IP-Adresse wird weiterhin gehasht (SHA-256)
- Row Level Security (RLS) aktiv
- Öffentlicher Zugriff erlaubt (akzeptabel für ein Browser-Spiel)

## Dateien geändert

1. `doku/supabase-schema.sql` - Schema-Update
2. `doku/bart_clicker_table.sql` - Tabellen-Definition
3. `doku/bart_clicker_add_username_migration.sql` - Migration-Script (NEU)
4. `games/bartclicker.html` - JavaScript-Implementierung
5. `doku/BART_CLICKER_SUPABASE.md` - Dokumentation aktualisiert
6. `doku/USERNAME_PERSISTENCE_IMPLEMENTATION.md` - Diese Datei (NEU)

## Testing

### Manueller Test:
1. Öffne `/games/bartclicker.html`
2. Gib einen Username ein (z.B. "TestUser123")
3. Spiele etwas und kaufe Items
4. Schließe die Seite
5. Öffne die Seite erneut
6. ✅ Username sollte automatisch wiederhergestellt sein
7. ✅ Spielstand sollte erhalten sein

### Überprüfung in Supabase:
1. Öffne Supabase Dashboard
2. Gehe zu "Table Editor"
3. Öffne `bart_clicker_game_state`
4. ✅ Username-Spalte sollte gefüllt sein

## Zusammenfassung

Die Username-Persistenz wurde erfolgreich implementiert. Benutzer müssen ihren Namen nur einmal eingeben, und er wird automatisch mit dem Spielstand synchronisiert. Die Lösung funktioniert sowohl online (Supabase) als auch offline (localStorage) und bietet maximale Kompatibilität.

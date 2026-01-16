// Clip des Monats - Voting System
(function () {
    'use strict';

    // NOTE: Laufzeit-Keys (z.B. SUPABASE_PUBLISHABLE_KEY) müssen vom Hosting-Environment
    // als globales JS-Variable injectiert werden, z.B. via Template oder build-step.
    // Wenn nicht vorhanden, fällt das Skript auf die alte Date-basierte Lese-Logik zurück.
    const SUPABASE_URL = window.SUPABASE_URL || null;
    const SUPABASE_PUBLISHABLE_KEY = window.SUPABASE_PUBLISHABLE_KEY || null;

    const CONFIG_URL = './votingData/config.json';
    const CLIPS_URL = './votingData/clips.json';
    const RESULTS_URL = './votingData/results.json';
    const VOTE_STORAGE_KEY = 'cdm_voted_clip';

    let currentConfig = null;
    let currentClips = null;
    let currentResults = null;

    // Queue für sequentielles Laden von Embeds (damit nicht alle iframes gleichzeitig geladen werden)
    const embedLoadQueue = [];
    let embedLoading = false;

    function enqueueEmbed(clip, placeholderEl) {
        embedLoadQueue.push({clip, placeholderEl});
        // Wenn gerade nichts geladen wird und dies das erste Element ist,
        // starte sofort den Ladevorgang synchron, damit der erste Clip möglichst schnell lädt.
        if (!embedLoading && embedLoadQueue.length === 1) {
            try {
                loadNextEmbed();
            } catch (e) {
                // Fallback: asynchron starten, falls synchrones Laden Probleme macht
                setTimeout(() => loadNextEmbed(), 0);
            }
        }
    }

    function startSequentialEmbedLoading() {
        // beginne nur, wenn nicht bereits geladen wird
        if (!embedLoading) {
            // starte asynchron, damit DOM-Einfügungen abgeschlossen sind
            setTimeout(() => loadNextEmbed(), 50);
        }
    }

    function loadNextEmbed() {
        if (embedLoading) return;
        const item = embedLoadQueue.shift();
        if (!item) return;
        embedLoading = true;

        const {clip, placeholderEl} = item;
        // Versuche ein iframe zu erzeugen
        const iframe = createEmbedIframe(clip);
        const parent = placeholderEl.parentNode;
        if (!iframe || !parent) {
            // Fallback: ersetze Platzhalter durch Thumbnail, öffnet Clip im neuen Tab
            const thumb = document.createElement('img');
            thumb.src = clip.thumbnail_url;
            thumb.alt = clip.title;
            thumb.className = 'clip-thumbnail';
            thumb.style.cursor = 'pointer';
            thumb.addEventListener('click', () => window.open(clip.url, '_blank'));
            if (parent) parent.replaceChild(thumb, placeholderEl);
            embedLoading = false;
            // Lade als nächstes das nächste Embed (kleine Pause)
            setTimeout(loadNextEmbed, 50);
            return;
        }

        iframe.style.width = '100%';
        iframe.style.height = '100%';

        // Wenn das iframe geladen oder fehlerhaft ist, fahre mit dem nächsten fort
        let settled = false;
        const settle = () => {
            if (settled) return;
            settled = true;
            embedLoading = false;
            // kurze Pause vor dem nächsten, um Bandbreite zu schonen
            setTimeout(loadNextEmbed, 100);
        };

        iframe.addEventListener('load', () => settle());
        iframe.addEventListener('error', () => settle());

        // Timeout-Fallback falls kein load/error ausgelöst wird
        const timeoutId = setTimeout(() => {
            settle();
            clearTimeout(timeoutId);
        }, 2500);

        // Ersetze Platzhalter durch iframe (das lädt dann und löst load aus)
        try {
            parent.replaceChild(iframe, placeholderEl);
        } catch (e) {
            // Falls ersetzen fehlschlägt, entferne placeholder und hänge iframe an
            try { parent.appendChild(iframe); } catch (e2) { /* ignore */ }
        }
    }

    // Constants for voting period calculation
    const VOTING_PERIOD_DAYS = 7; // Last 7 days of the month

    // Calculate the last week of the current month
    function getLastWeekOfMonth(referenceDate = new Date()) {
        const year = referenceDate.getFullYear();
        const month = referenceDate.getMonth();

        // Get the last day of the month
        const lastDay = new Date(year, month + 1, 0);
        const lastDayOfMonth = lastDay.getDate();

        // Calculate the start of the last week (VOTING_PERIOD_DAYS before the last day)
        const startOfLastWeek = new Date(year, month, lastDayOfMonth - (VOTING_PERIOD_DAYS - 1), 0, 0, 0, 0);
        const endOfLastWeek = new Date(year, month, lastDayOfMonth, 23, 59, 59, 999);

        return {start: startOfLastWeek, end: endOfLastWeek};
    }

    // Check if current date is in the last week of the month
    function isInLastWeekOfMonth(now = new Date()) {
        const lastWeek = getLastWeekOfMonth(now);
        return now >= lastWeek.start && now <= lastWeek.end;
    }

    // Initialize the voting system
    async function init() {
        try {
            // Load configuration
            currentConfig = await fetchJSON(CONFIG_URL);

            // Check if voting is currently active
            // Voting is automatically active during the last week of each month
            const now = new Date();
            const isVotingActive = isInLastWeekOfMonth(now);

            // Check voting status
            if (isVotingActive) {
                // Load clips and show voting interface
                currentClips = await fetchJSON(CLIPS_URL);
                await showVotingInterface();
            } else {
                // Load results and show results interface
                currentResults = await fetchJSON(RESULTS_URL);
                await showResultsInterface();
            }
        } catch (error) {
            console.error('Error initializing voting system:', error);
            showError('Es stehen aktuell keine Ergebnisse oder Clips zum Voting zur Verfügung. Bitte versuche es später erneut.');
        }
    }

    // Fetch JSON data or Supabase fallback
    async function fetchJSON(url) {
        // If Supabase is configured, try using the public REST endpoint for reads
        if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
            try {
                // Map known file endpoints to table names
                if (url.includes('clips.json')) {
                    const resp = await fetch(`${SUPABASE_URL}/rest/v1/clips?select=*&order=created_at.desc`, {
                        headers: {
                            apikey: SUPABASE_PUBLISHABLE_KEY,
                            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
                        }
                    });
                    if (!resp.ok) throw new Error('Supabase clips request failed');
                    const rows = await resp.json();
                    return { clips: rows, fetchedAt: new Date().toISOString(), period: {} };
                }
                if (url.includes('results.json')) {
                    // Fetch latest result by month_key descending
                    const resp = await fetch(`${SUPABASE_URL}/rest/v1/results?select=*&order=month_key.desc&limit=1`, {
                        headers: {
                            apikey: SUPABASE_PUBLISHABLE_KEY,
                            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
                        }
                    });
                    if (!resp.ok) throw new Error('Supabase results request failed');
                    const rows = await resp.json();
                    if (rows.length === 0) return { results: [] };
                    return rows[0].data || { results: [] };
                }
                if (url.includes('config.json')) {
                    // Try to fetch a config row if exists
                    const resp = await fetch(`${SUPABASE_URL}/rest/v1/config?select=*&limit=1`, {
                        headers: {
                            apikey: SUPABASE_PUBLISHABLE_KEY,
                            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
                        }
                    });
                    if (!resp.ok) throw new Error('Supabase config request failed');
                    const rows = await resp.json();
                    return rows.length ? rows[0] : {};
                }
            } catch (err) {
                console.warn('Supabase fallback failed, falling back to file fetch:', err);
                // Fallthrough to file-based fetch
            }
        }

        // File-based fetch (legacy fallback)
        const response = await fetch(url + '?t=' + Date.now());
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    // Show voting interface
    async function showVotingInterface() {
        const container = document.getElementById('voting-container');
        if (!container) return;

        // Check if user has already voted
        const votedClipId = localStorage.getItem(VOTE_STORAGE_KEY);

        if (votedClipId) {
            showVotedMessage(votedClipId);
            return;
        }

        // Calculate and show voting period info (automatically last week of current month)
        const votingPeriod = getLastWeekOfMonth();
        const startDate = votingPeriod.start;
        const endDate = votingPeriod.end;

        const header = document.createElement('div');
        header.className = 'voting-header';
        header.innerHTML = `
      <h2>Voting ist aktiv!</h2>
      <p>Voting-Zeitraum: ${formatDate(startDate)} - ${formatDate(endDate)}</p>
      <p>Du kannst für genau einen Clip abstimmen. Wähle deinen Favoriten aus!</p>
      <p><strong>${currentClips.clips.length} Clips</strong> stehen zur Auswahl.</p>
    `;
        container.appendChild(header);

        // Show clips
        const clipsGrid = document.createElement('div');
        clipsGrid.className = 'clips-grid';

        currentClips.clips.forEach(clip => {
            const clipCard = createClipCard(clip);
            clipsGrid.appendChild(clipCard);
        });

        container.appendChild(clipsGrid);

        // Starte sequentielles Laden der Embeds (1., 2., 3. ...)
        startSequentialEmbedLoading();
    }

    // Create clip card
    function createClipCard(clip) {
        const card = document.createElement('div');
        card.className = 'clip-card';

        // Direktes Embed: wenn möglich zeigen wir das iframe sofort an.
        const embedWrapper = document.createElement('div');
        embedWrapper.className = 'clip-embed-wrapper';
        embedWrapper.style.width = '100%';
        embedWrapper.style.height = '360px';
        embedWrapper.style.marginBottom = '8px';

        // Wir fügen einen Platzhalter ein und enqueuen das Embed, damit iframes
        // nacheinander geladen werden (verbessert Time-to-first-clip bei vielen Clips).
        if (canEmbedClip(clip)) {
            const placeholder = document.createElement('div');
            placeholder.className = 'clip-embed-placeholder';
            placeholder.style.width = '100%';
            placeholder.style.height = '100%';
            placeholder.dataset.clipId = clip.id;
            // einfacher Ladehinweis
            placeholder.innerHTML = '<div class="embed-loading">Lade Clip…</div>';
            embedWrapper.appendChild(placeholder);
            enqueueEmbed(clip, placeholder);
        } else {
            // Fallback: zeige das Thumbnail und öffne den Clip im neuen Tab beim Klick
            const thumbnail = document.createElement('img');
            thumbnail.src = clip.thumbnail_url;
            thumbnail.alt = clip.title;
            thumbnail.className = 'clip-thumbnail';
            thumbnail.style.cursor = 'pointer';
            thumbnail.addEventListener('click', () => window.open(clip.url, '_blank'));
            embedWrapper.appendChild(thumbnail);
        }

        const info = document.createElement('div');
        info.className = 'clip-info';

        const title = document.createElement('h3');
        title.textContent = clip.title;
        title.className = 'clip-title';

        const meta = document.createElement('div');
        meta.className = 'clip-meta';
        meta.innerHTML = `
      <span>👁️ ${clip.view_count.toLocaleString()} Views</span>
      <span>⏱️ ${Math.floor(clip.duration)}s</span>
      <span>📅 ${formatDate(new Date(clip.created_at))}</span>
    `;

        const creator = document.createElement('div');
        creator.className = 'clip-creator';
        creator.textContent = `Erstellt von: ${clip.creator_name}`;

        const voteBtn = document.createElement('button');
        voteBtn.className = 'btn btn-primary vote-btn';
        voteBtn.textContent = 'Für diesen Clip voten';
        voteBtn.onclick = () => voteForClip(clip.id);

        info.appendChild(title);
        info.appendChild(meta);
        info.appendChild(creator);
        // Zeige "Clip ansehen" vor dem Vote-Button, damit Nutzer die Quelle schnell öffnen können
        info.appendChild(voteBtn);
        // Embed wird durch Klick auf das Thumbnail gesteuert

        // Embed/Fallback zuerst, dann Info
        card.appendChild(embedWrapper);

        card.appendChild(info);

        return card;
    }

    // Vote for a clip - send to server endpoint which records IP server-side
    async function voteForClip(clipId) {
        if (!confirm('Möchtest du wirklich für diesen Clip abstimmen? Du kannst nur einmal voten!')) {
            return;
        }

        try {
            const resp = await fetch('/api/submit-vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clip_id: clipId })
            });

            if (resp.status === 200) {
                // UX: mark as voted locally to prevent immediate re-vote attempts
                try { localStorage.setItem(VOTE_STORAGE_KEY, clipId); } catch (e) { /* ignore */ }
                showVotedMessage(clipId);
                return;
            }

            if (resp.status === 409) {
                // Already voted
                showError('Du hast bereits für diesen Clip abgestimmt (gleiche IP).');
                return;
            }

            // Other errors
            const body = await resp.text();
            throw new Error(`Vote failed: ${resp.status} ${body}`);

        } catch (error) {
            console.error('Error submitting vote:', error);
            showError('Fehler beim Abstimmen. Bitte versuche es später erneut.');
        }
    }

    // Show voted message
    function showVotedMessage() {
        const container = document.getElementById('voting-container');
        if (!container) return;

        container.innerHTML = '';

        const message = document.createElement('div');
        message.className = 'voted-message';
        message.innerHTML = `
      <h2>✅ Vielen Dank für deine Stimme!</h2>
      <p>Du hast erfolgreich abgestimmt.</p>
      <p>Die Ergebnisse werden am Ende des Voting-Zeitraums veröffentlicht.</p>
      <p class="note">Hinweis: Du hast bereits abgestimmt und kannst nicht erneut voten.</p>
    `;

        container.appendChild(message);
    }

    // Show results interface
    async function showResultsInterface() {
        const container = document.getElementById('voting-container');
        if (!container) return;

        if (!currentResults || !currentResults.results || currentResults.results.length === 0) {
            // Wenn keine Ergebnisse vorhanden sind und Voting nicht aktiv ist,
            // zeigen wir eine spezifische, hilfreiche Meldung an.
            showNoResultsMessage();
            return;
        }

        const header = document.createElement('div');
        header.className = 'results-header';
        header.innerHTML = `
      <h2>🏆 Top ${currentResults.results.length} Clips</h2>
      <p>Zeitraum: ${formatDate(new Date(currentResults.period.start))} - ${formatDate(new Date(currentResults.period.end))}</p>
      <p>Gesamtstimmen: <strong>${currentResults.totalVotes || 0}</strong></p>
      <p>Berechnet am: ${formatDate(new Date(currentResults.calculatedAt))}</p>
    `;
        container.appendChild(header);

        const resultsGrid = document.createElement('div');
        resultsGrid.className = 'results-grid';

        currentResults.results.forEach((clip, index) => {
            const resultCard = createResultCard(clip, index + 1);
            resultsGrid.appendChild(resultCard);
        });

        container.appendChild(resultsGrid);

        // Starte sequentielles Laden der Embeds für Ergebnisse
        startSequentialEmbedLoading();
    }

    // Zeige eine freundliche Meldung, wenn es keine Ergebnisse für den letzten Monat gibt
    function showNoResultsMessage() {
        const container = document.getElementById('voting-container');
        if (!container) return;

        container.innerHTML = '';

        const message = document.createElement('div');
        message.className = 'no-results-message';
        // Hinweis: Wir verwenden hier eine allgemeine Formulierung — die Seite wird
        // beim Hosting die korrekte Domain als parent für Twitch-Embeds benötigen.
        message.innerHTML = `
      <h2>ℹ️ Noch keine Ergebnisse für den letzten Monat</h2>
      <p>Für den letzten Monat sind derzeit noch keine Ergebnisse verfügbar.</p>
      <p>Das Voting ist aktuell nicht aktiv. Das Voting findet jeweils in der letzten Woche des Monats statt.</p>
      <p>Schau bitte kurz vor Monatsende wieder vorbei — dann wird das Voting automatisch aktiviert.</p>
      <p class="note">Wenn du Clips einsehen möchtest, lade die Seite neu, sobald neue Daten vorhanden sind.</p>
    `;

        container.appendChild(message);
    }

    // Create result card
    function createResultCard(clip, rank) {
        const card = document.createElement('div');
        card.className = 'result-card';

        const rankBadge = document.createElement('div');
        rankBadge.className = 'rank-badge';
        rankBadge.textContent = `#${rank}`;

        // Direktes Embed anzeigen (oder Fallback auf Thumbnail, das im neuen Tab öffnet)
        const embedWrapper = document.createElement('div');
        embedWrapper.className = 'clip-embed-wrapper';
        embedWrapper.style.width = '100%';
        embedWrapper.style.height = '360px';
        embedWrapper.style.marginBottom = '8px';

        if (canEmbedClip(clip)) {
            const placeholder = document.createElement('div');
            placeholder.className = 'clip-embed-placeholder';
            placeholder.style.width = '100%';
            placeholder.style.height = '100%';
            placeholder.dataset.clipId = clip.id;
            placeholder.innerHTML = '<div class="embed-loading">Lade Clip…</div>';
            embedWrapper.appendChild(placeholder);
            enqueueEmbed(clip, placeholder);
        } else {
            const thumbnail = document.createElement('img');
            thumbnail.src = clip.thumbnail_url;
            thumbnail.alt = clip.title;
            thumbnail.className = 'clip-thumbnail';
            thumbnail.style.cursor = 'pointer';
            thumbnail.addEventListener('click', () => window.open(clip.url, '_blank'));
            embedWrapper.appendChild(thumbnail);
        }

        const info = document.createElement('div');
        info.className = 'clip-info';

        const title = document.createElement('h3');
        title.textContent = clip.title;
        title.className = 'clip-title';

        const votes = document.createElement('div');
        votes.className = 'clip-votes';
        votes.innerHTML = `<strong>🗳️ ${clip.votes || 0} Stimmen</strong>`;

        const meta = document.createElement('div');
        meta.className = 'clip-meta';
        meta.innerHTML = `
      <span>👁️ ${clip.view_count.toLocaleString()} Views</span>
      <span>⏱️ ${Math.floor(clip.duration)}s</span>
      <span>📅 ${formatDate(new Date(clip.created_at))}</span>
    `;

        const creator = document.createElement('div');
        creator.className = 'clip-creator';
        creator.textContent = `Erstellt von: ${clip.creator_name}`;

        info.appendChild(title);
        info.appendChild(votes);
        info.appendChild(meta);
        info.appendChild(creator);
        // Embed wird durch Klick auf das Thumbnail gesteuert

        card.appendChild(rankBadge);
        card.appendChild(embedWrapper);
         card.appendChild(info);

         return card;
    }

    // Prüft, ob ein Clip eingebettet werden kann (Twitch benötigt normalerweise eine nicht-lokale Domain).
    // Für Entwicklung kann `currentConfig.allowLocalEmbeds` aktiviert werden, um Embeds lokal zu erlauben.
    function canEmbedClip(/* optional clip */) {
        // Dev override aus config
        if (currentConfig && currentConfig.allowLocalEmbeds) return true;

        const hostname = window.location.hostname || window.location.host || '';
        if (!hostname) return false;
        const isLocal = hostname === 'localhost' || hostname.startsWith('127.') || hostname === '::1';
        return !isLocal;
    }


    // Erzeugt ein iframe-Element für den Clip. Wenn nicht möglich, return null.
    function createEmbedIframe(clip) {
        try {
            if (!canEmbedClip()) return null;

            const parent = window.location.host;
            if (!parent) return null;

            const iframe = document.createElement('iframe');
            iframe.allowFullscreen = true;
            iframe.frameBorder = '0';
            iframe.style.width = '100%';
            iframe.style.height = '100%';

            iframe.src =
                `https://clips.twitch.tv/embed?clip=${clip.id}&parent=${parent}`;

            return iframe;
        } catch (err) {
            console.error('Embed creation failed', err);
            return null;
        }
    }

    // Show error message
    function showError(message) {
        const container = document.getElementById('voting-container');
        if (!container) return;

        container.innerHTML = `
      <div class="error-message">
        <h2>⚠️ Fehler</h2>
        <p>${message}</p>
      </div>
    `;
    }

    // Format date
    function formatDate(date) {
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

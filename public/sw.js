const CACHE_NAME = 'hd-static-v3';

// Precache only URLs that actually exist in the deployed app.
// Keep this list conservative: missing entries will be fetched from network normally.
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/sw.js',
  '/css/styles.css',
  '/css/mobile.css',
  '/css/cookie-banner.css',
  '/css/clip-voting.css',
  // JS files that are served as static assets (not Vite-bundled)
  '/js/config.js',
  '/js/cookie-consent.js',
  '/js/page-view-tracker.js',
  '/js/supabase-client.js',
  '/img/Logos/StreamElements.png',
  '/img/Logos/HDProfile.webp',
  '/img/logo128.png'
];

// Install: precache shell
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(err => {
        // swallow errors to allow SW to install even if some assets fail
        console.warn('Precache failed:', err);
      }))
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Allow the page to trigger immediate activation of an updated SW
self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    try { self.skipWaiting(); } catch (e) {}
  }
});

// Helper: safe fetch that rejects on non-OK
function fetchSafe(request) {
  return fetch(request).then(response => {
    if (!response || response.status !== 200) throw new Error('Bad response');
    return response;
  });
}

// Fetch handler
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore third-party requests (let browser handle them)
  if (url.origin !== location.origin) {
    return;
  }

  // Never intercept Vite dev-source paths. If a stale index.html tries to load /src/*,
  // we want this to fail fast and/or be served by the network (not SW cache).
  if (url.pathname.startsWith('/src/')) {
    return;
  }

  // Navigation requests: try network first, fallback to cache, then offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetchSafe(req).then(networkResponse => {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
        return networkResponse;
      }).catch(() => caches.match(req).then(r => r || caches.match('/offline.html')))
    );
    return;
  }

  // For other requests (CSS/JS/images): cache-first strategy with background update
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        // update in background
        fetch(req).then(resp => {
          if (resp && resp.ok) caches.open(CACHE_NAME).then(cache => cache.put(req, resp.clone())).catch(()=>{});
        }).catch(()=>{});
        return cached;
      }

      return fetch(req).then(resp => {
        if (!resp || resp.status !== 200) return resp;

        // Don't cache anything under /src/ (shouldn't happen in prod, but play safe)
        if (url.pathname.startsWith('/src/')) return resp;

        const respClone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, respClone)).catch(()=>{});
        return resp;
      }).catch(() => {
        if (req.destination === 'image') {
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        }
        return caches.match('/offline.html');
      });
    })
  );
});

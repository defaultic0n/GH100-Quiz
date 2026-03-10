// Bump this when you change core app files (index/app/styles/manifest/icons/etc.)
const CACHE_NAME = 'gh100-flashcards-baseline2e-swr-v2';

// Core “app shell” assets to precache (keep stable)
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',

  // configs (precached)
  './decks.auto.json',
  './decks.json',

  // (optional) keep key decks precached; SWR will also cache/update them at runtime
  './cards.json',
  './hard.json',
  './Actual4Test_cards.json',
  './QnAfromMultiSite_cards.json',
  './ShapingPixel_cards.json',
  './MS_Practise_QnA_cards.json',

  './manifest.json',

  // If your icons are at root (as per your updated manifest)
  './icon-192.png',
  './icon-512.png'

  // If you instead use ./icons/icon-192.png, ./icons/icon-512.png
  // then swap the two lines above accordingly.
];

// ---- helpers ----
function sameOrigin(urlStr) {
  try {
    const url = new URL(urlStr);
    return url.origin === self.location.origin;
  } catch {
    return false;
  }
}

// Apply SWR only to deck/config JSON so decks stay fresh without breaking offline
function isDeckOrConfigRequest(req) {
  try {
    const url = new URL(req.url);
    const p = url.pathname.toLowerCase();

    if (url.origin !== self.location.origin) return false;

    return (
      p.endsWith('/decks.json') ||
      p.endsWith('/decks.auto.json') ||
      p.endsWith('_cards.json') ||
      p.endsWith('/cards.json') ||      // your base deck file name
      p.endsWith('/hard.json')          // your hard deck file name
    );
  } catch {
    return false;
  }
}

// Cache-first for app shell assets (fast + stable)
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  const resp = await fetch(req);
  if (resp && resp.ok && sameOrigin(req.url)) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, resp.clone());
  }
  return resp;
}

// Stale-while-revalidate for decks/config:
// - return cached immediately if present
// - in parallel, fetch latest and update cache
async function staleWhileRevalidate(req, event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);

  const updatePromise = fetch(req)
    .then(resp => {
      if (resp && resp.ok) cache.put(req, resp.clone());
      return resp;
    })
    .catch(() => null);

  // keep SW alive to finish background update
  event.waitUntil(updatePromise);

  // if we have cached, serve it now (stale), otherwise wait for network
  if (cached) return cached;

  const fresh = await updatePromise;
  // If network fails and no cache exists, fall back to a standard fetch
  return fresh || fetch(req);
}

// ---- lifecycle ----
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ---- fetch routing ----
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // only GET
  if (req.method !== 'GET') return;

  // SWR for deck/config JSON; cache-first for everything else
  if (isDeckOrConfigRequest(req)) {
    event.respondWith(staleWhileRevalidate(req, event));
  } else {
    event.respondWith(cacheFirst(req));
  }
});
// Bump this whenever you change decks/config/assets
const CACHE_NAME = 'gh100-flashcards-baseline2e-v3';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',

  // deck configs
  './decks.auto.json',
  './decks.json',

  // decks (cache them so decks don’t “disappear” on flaky/offline)
  './cards.json',
  './hard.json',
  './Actual4Test_cards.json',
  './QnAfromMultiSite_cards.json',
  './ShapingPixel_cards.json',

  // PWA
  './manifest.json',

  // icons (root files)
  './icon-192.png',
  './icon-512.png'
];

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

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
const CACHE = 'stretch-pwa-v7';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './manifest.en.webmanifest',
  './js/app.js',
  './js/db.js',
  './js/i18n.js',
  './js/seed.js',
  './js/voice.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './audio/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    try {
      const response = await fetch('./audio/manifest.json', { cache: 'no-cache' });
      const manifest = await response.json();
      const files = (manifest.files || []).map((file) => './' + file);
      // ~1000 clips: allSettled in small batches so one missing file cannot
      // abort the whole install, and the platform is not hit with one huge
      // addAll transaction.
      const SIZE = 24;
      for (let i = 0; i < files.length; i += SIZE) {
        await Promise.allSettled(
          files.slice(i, i + SIZE).map((file) => cache.add(file))
        );
      }
    } catch (error) {
      // Audio can still be fetched on demand; offline playback needs the pack.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      });
    })
  );
});

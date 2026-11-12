const CACHE = 'stretch-pwa-v11';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './manifest.en.webmanifest',
  './js/app.js',
  './js/cues.js',
  './js/db.js',
  './js/i18n.js',
  './js/seed.js',
  './js/speed.js',
  './js/voice.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './audio/manifest.json',
];

/* Fixed transition cue ("Time's up."), one per voice. Cached explicitly so a
 * failed audio-manifest fetch during install cannot leave the rest cue silent
 * offline. */
const FIXED_AUDIO = [
  './audio/zh/xiaoxiao/timeup.mp3',
  './audio/zh/xiaoyi/timeup.mp3',
  './audio/zh/yunxi/timeup.mp3',
  './audio/zh/yunjian/timeup.mp3',
  './audio/en/aria/timeup.mp3',
  './audio/en/jenny/timeup.mp3',
  './audio/en/guy/timeup.mp3',
  './audio/en/andrew/timeup.mp3',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    const files = new Set(FIXED_AUDIO);
    try {
      const response = await fetch('./audio/manifest.json', { cache: 'no-cache' });
      const manifest = await response.json();
      (manifest.files || []).forEach((file) => files.add('./' + file));
    } catch (error) {
      // Audio can still be fetched on demand; offline playback needs the pack.
    }
    // ~1000 clips: allSettled in small batches so one missing file cannot
    // abort the whole install, and the platform is not hit with one huge
    // addAll transaction.
    const list = Array.from(files);
    const SIZE = 24;
    for (let i = 0; i < list.length; i += SIZE) {
      await Promise.allSettled(
        list.slice(i, i + SIZE).map((file) => cache.add(file))
      );
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

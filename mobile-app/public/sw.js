const CACHE_NAME = 'vialflow-assets-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/Y-Bot.glb',
  '/manifest.json',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignorujemy zapytania do API oraz hot-reloads/webpack/metro
  if (url.pathname.startsWith('/api/') || url.pathname.includes('hot-update') || url.hostname === 'localhost' && !url.pathname.endsWith('.glb')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        const isStaticAsset = 
          event.request.destination === 'image' ||
          event.request.destination === 'script' ||
          event.request.destination === 'style' ||
          url.pathname.endsWith('.glb') ||
          url.pathname.endsWith('.mp3');

        if (response && response.status === 200 && isStaticAsset) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      }).catch((err) => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
        throw err;
      });
    })
  );
});

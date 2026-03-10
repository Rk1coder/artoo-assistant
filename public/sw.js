self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // Simple pass-through for PWA compliance
  e.respondWith(fetch(e.request));
});

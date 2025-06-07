// public/sw.js
const CACHE_NAME = 'shared-trade-ledger-cache-v2'; // Updated cache version
const STATIC_ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon.ico',
  // Assuming Vite builds to /assets/index.js and /assets/index.css
  '/assets/index.js', // Main bundled JavaScript file
  '/assets/index.css' // Main bundled CSS file
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Opened cache and caching static assets');
      return Promise.all(
        STATIC_ASSETS_TO_CACHE.map(url => {
          return cache.add(url).catch(reason => {
            console.warn(`[Service Worker] Failed to cache ${url}: ${reason}`);
          });
        })
      );
    }).catch(error => {
        console.error('[Service Worker] Cache open/add failed during install:', error);
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
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Check if the request is for a Google Sheets API call or other external resource
  if (requestUrl.origin !== self.location.origin || requestUrl.pathname.includes('script.google.com')) {
    // For external resources or API calls, try network first, then potentially cache or just fail if offline
    // This example prioritizes network for these calls.
    event.respondWith(
      fetch(event.request).catch(() => {
        // Optionally, return a custom offline response for API calls
        // For now, let it fail as per browser default for API calls.
      })
    );
    return;
  }
  
  // For navigation and local static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          // Cache the fetched resource only if it's one of our defined static assets
          // or if it's a root navigation (index.html)
          if (STATIC_ASSETS_TO_CACHE.includes(requestUrl.pathname) || event.request.mode === 'navigate' && requestUrl.pathname === '/') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for navigation if network fails and not in cache
        if (event.request.mode === 'navigate') {
          return caches.match('/') || caches.match('/index.html');
        }
        // For other assets, if fetch fails, browser default error will be shown
      });
    })
  );
});

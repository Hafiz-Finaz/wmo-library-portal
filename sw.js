// WMO Academy Library Service Worker (PWA Offline Caching)

const CACHE_NAME = 'wmo-library-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/about.html',
  '/books.html',
  '/categories.html',
  '/contact.html',
  '/login.html',
  '/css/style.css',
  '/css/admin.css',
  '/css/responsive.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/books.js',
  '/js/search.js',
  '/assets/logo/logo.svg'
];

// Install Service Worker and cache core static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened static assets cache storage');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clean up old cache versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old service worker cache versions:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Serve cached assets when offline, otherwise fetch from web
self.addEventListener('fetch', event => {
  // Only intercept HTTP/S requests, ignore browser extensions or supabase cdn tokens queries
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Serve from cache
          return response;
        }

        // Fetch from network
        return fetch(event.request).then(networkResponse => {
          // Check if response is valid
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Dynamically cache page requests
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      }).catch(() => {
        // Return offline fallback if offline and cache misses
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      })
  );
});

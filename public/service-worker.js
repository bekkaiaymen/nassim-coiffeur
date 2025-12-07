// Service Worker for Nassim Coiffeur PWA
const CACHE_NAME = 'nassim-v1.0.2';
const ASSETS_TO_CACHE = [
  '/nassim',
  '/nassim/nassim.css',
  '/nassim/nassim.js',
  '/nassim/logo.jpg',
  '/manifest.json'
];

// Install Event - Cache assets
self.addEventListener('install', (event) => {
  console.log(' Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(' Service Worker: Caching assets');
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => 
            cache.add(url).catch(err => {
              console.warn(\ Failed to cache \:\, err.message);
              return null;
            })
          )
        );
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error(' Service Worker: Cache error:', error);
        self.skipWaiting();
      })
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  console.log(' Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log(' Service Worker: Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        if (event.request.method === 'GET') {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push Event - Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log(' Service Worker: Push Received');
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn(' Push data is not JSON:', e);
      data = { title: '????? ????', message: event.data.text() };
    }
  } else {
    data = { title: '????? ????', message: '???? ????? ???? ?? ????? ????' };
  }

  const title = data.title || '????? ????';
  const options = {
    body: data.message || data.body,
    icon: data.icon || '/nassim/logo.jpg',
    badge: '/nassim/logo.jpg',
    vibrate: [100, 50, 100],
    data: data.data || {},
    requireInteraction: true, // Keeps notification until user interacts
    actions: [
      { action: 'open', title: '??? ????????' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  console.log(' Service Worker: Notification Clicked');
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/nassim-employee';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

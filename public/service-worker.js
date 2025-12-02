// Service Worker for Nassim Coiffeur PWA
const CACHE_NAME = 'nassim-v1.0.0';
const ASSETS_TO_CACHE = [
  '/nassim',
  '/public/nassim/nassim.css',
  '/public/nassim/nassim.js',
  '/public/nassim/logo.jpg',
  '/public/nassim/background.jpg',
  '/public/manifest.json'
];

// Install Event - Cache assets
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Service Worker: Caching assets');
        // Cache files one by one to handle missing files gracefully
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => 
            cache.add(url).catch(err => {
              console.warn(`⚠️ Failed to cache ${url}:`, err.message);
              return null;
            })
          )
        );
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('❌ Service Worker: Cache error:', error);
        // Continue even if caching fails
        self.skipWaiting();
      })
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response
        const responseClone = response.clone();
        
        // Update cache
        if (event.request.method === 'GET' && event.request.url.startsWith('http')) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request);
      })
  );
});

// Background Sync for offline appointments
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments());
  }
});

async function syncAppointments() {
  // Sync pending appointments when back online
  console.log('🔄 Syncing appointments...');
}

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Nassim Coiffeur';
  const options = {
    body: data.body || 'لديك إشعار جديد',
    icon: '/public/nassim/logo.jpg',
    badge: '/public/nassim/logo.jpg',
    vibrate: [200, 100, 200],
    data: data,
    actions: [
      {
        action: 'view',
        title: 'عرض'
      },
      {
        action: 'close',
        title: 'إغلاق'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/nassim')
    );
  }
});

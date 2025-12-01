// Nassim Coiffeur - Service Worker
// Version 2.0 - Background Notifications Support

const CACHE_NAME = 'nassim-v2.0';
const urlsToCache = [
    '/nassim/',
    '/nassim/index.html',
    '/nassim/nassim.css',
    '/nassim/nassim.js',
    '/nassim/logo.jpg'
];

// Install Service Worker
self.addEventListener('install', event => {
    console.log('🔧 Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Service Worker
self.addEventListener('activate', event => {
    console.log('✅ Service Worker: Activated');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch from cache or network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(response => {
                    // Don't cache non-successful responses
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    
                    return response;
                });
            })
    );
});

// Push Notification Handler
self.addEventListener('push', event => {
    console.log('🔔 Push notification received:', event);
    
    let notificationData = {
        title: 'Nassim Coiffeur',
        body: 'لديك إشعار جديد',
        icon: '/nassim/logo.jpg',
        badge: '/nassim/logo.jpg',
        vibrate: [200, 100, 200],
        tag: 'nassim-notification',
        requireInteraction: false
    };
    
    if (event.data) {
        try {
            const data = event.data.json();
            notificationData = {
                ...notificationData,
                title: data.title || notificationData.title,
                body: data.message || data.body || notificationData.body,
                data: data
            };
        } catch (e) {
            notificationData.body = event.data.text();
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            vibrate: notificationData.vibrate,
            tag: notificationData.tag,
            requireInteraction: notificationData.requireInteraction,
            data: notificationData.data,
            actions: [
                {
                    action: 'open',
                    title: 'فتح التطبيق',
                    icon: '/nassim/logo.jpg'
                },
                {
                    action: 'close',
                    title: 'إغلاق',
                    icon: '/nassim/logo.jpg'
                }
            ]
        })
    );
});

// Notification Click Handler
self.addEventListener('notificationclick', event => {
    console.log('🖱️ Notification clicked:', event);
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then(clientList => {
                    // Check if app is already open
                    for (let client of clientList) {
                        if (client.url.includes('/nassim/') && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // Open new window if not
                    if (clients.openWindow) {
                        return clients.openWindow('/nassim/');
                    }
                })
        );
    }
});

// Background Sync for Notifications Check
self.addEventListener('sync', event => {
    console.log('🔄 Background sync:', event.tag);
    
    if (event.tag === 'check-notifications') {
        event.waitUntil(checkForNewNotifications());
    }
});

// Check for new notifications in background
async function checkForNewNotifications() {
    try {
        const token = await getTokenFromStorage();
        if (!token) return;
        
        const API_URL = 'https://nassim-coiffeur.onrender.com/api';
        const customerId = await getCustomerIdFromStorage();
        
        if (!customerId) return;
        
        const response = await fetch(`${API_URL}/notifications/customer/${customerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.success && data.data) {
            const unreadNotifications = data.data.filter(n => !n.read);
            
            // Show notification for latest unread
            if (unreadNotifications.length > 0) {
                const latest = unreadNotifications[0];
                await self.registration.showNotification(latest.title, {
                    body: latest.message,
                    icon: '/nassim/logo.jpg',
                    badge: '/nassim/logo.jpg',
                    vibrate: [200, 100, 200],
                    tag: 'nassim-notification',
                    data: latest
                });
            }
        }
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}

// Helper: Get token from IndexedDB/localStorage
async function getTokenFromStorage() {
    try {
        // Try to get from all open clients
        const allClients = await clients.matchAll({ includeUncontrolled: true });
        for (let client of allClients) {
            const token = await client.postMessage({ type: 'GET_TOKEN' });
            if (token) return token;
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Helper: Get customer ID from storage
async function getCustomerIdFromStorage() {
    try {
        const allClients = await clients.matchAll({ includeUncontrolled: true });
        for (let client of allClients) {
            const customerId = await client.postMessage({ type: 'GET_CUSTOMER_ID' });
            if (customerId) return customerId;
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Periodic Background Sync (if supported)
self.addEventListener('periodicsync', event => {
    console.log('⏰ Periodic sync:', event.tag);
    
    if (event.tag === 'check-notifications-periodic') {
        event.waitUntil(checkForNewNotifications());
    }
});

console.log('🚀 Nassim Service Worker Loaded - v2.0');

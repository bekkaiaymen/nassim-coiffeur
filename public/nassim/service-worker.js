// Nassim Coiffeur - Service Worker
// Version 2.0 - Background Notifications Support

const CACHE_NAME = 'nassim-v2.0';
const urlsToCache = [
    '/nassim/',
    '/nassim/index.html',
    '/nassim/nassim.css',
    '/nassim/nassim.js',
    '/nassim/favicon.svg',
    '/nassim/logo.jpg'
];

// Install Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// Activate Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch from cache or network
self.addEventListener('fetch', event => {
    const { request } = event;

    // Allow non-GET requests (POST, PUT, etc.) to pass through untouched
    if (request.method !== 'GET') {
        return;
    }

    // Serve favicon.ico from our SVG asset to avoid 404s
    if (request.url.endsWith('/favicon.ico')) {
        const svgRequest = new Request('/nassim/favicon.svg', { cache: 'reload' });

        event.respondWith(
            caches.match(svgRequest).then(cached => {
                if (cached) {
                    return cached;
                }

                return fetch(svgRequest).then(response => {
                    if (response && response.status === 200 && svgRequest.method === 'GET' && svgRequest.url.startsWith('http')) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(svgRequest, responseToCache));
                    }
                    return response;
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            
            return fetch(request).then(response => {
                // Only cache valid GET requests
                if (response && response.status === 200 && request.method === 'GET' && request.url.startsWith('http')) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
                }
                return response;
            });
        })
    );
});

// Push Notification Handler
self.addEventListener('push', event => {
    console.log('🔔 Push event received in SW');
    
    let notificationData = {
        title: 'Nassim Coiffeur',
        body: 'لديك إشعار جديد',
        icon: '/nassim/logo.jpg',
        badge: '/nassim/logo.jpg',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'nassim-' + Date.now(),
        requireInteraction: true,
        silent: false
    };
    
    if (event.data) {
        try {
            const data = event.data.json();
            console.log('📨 Push payload:', data);
            notificationData = {
                ...notificationData,
                title: data.title || notificationData.title,
                body: data.message || data.body || notificationData.body,
                data: data,
                tag: data.type ? `nassim-${data.type}-${Date.now()}` : notificationData.tag
            };
        } catch (e) {
            console.error('Push JSON parse error:', e);
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
            requireInteraction: true,
            silent: false,
            renotify: true,
            timestamp: Date.now(),
            data: notificationData.data,
            actions: [
                {
                    action: 'open',
                    title: 'فتح'
                },
                {
                    action: 'close',
                    title: 'إغلاق'
                }
            ],
            image: notificationData.icon,
            dir: 'rtl',
            lang: 'ar'
        }).then(() => console.log('✅ Notification displayed'))
          .catch(err => console.error('❌ Failed to show notification:', err))
    );
});

// Notification Click Handler
self.addEventListener('notificationclick', event => {
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
    if (event.tag === 'check-notifications') {
        event.waitUntil(checkForNewNotifications());
    }
});

// Check for new notifications in background
async function checkForNewNotifications() {
    try {
        const token = await getTokenFromStorage();
        if (!token) {
            console.warn('⚠️ No token for background sync');
            return;
        }
        
        const API_URL = 'https://nassim-coiffeur.onrender.com/api';
        const customerId = await getCustomerIdFromStorage();
        
        if (!customerId) {
            console.warn('⚠️ No customer ID for background sync');
            return;
        }
        
        console.log('🔍 Background sync: checking unread for', customerId);
        
        const response = await fetch(`${API_URL}/notifications/check-unread/${customerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            console.warn('⚠️ Check-unread endpoint returned', response.status);
            return;
        }
        
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
            console.log('📬 Background sync found', data.data.length, 'unread notifications');
            
            // Show notification for each unread
            for (const notif of data.data) {
                try {
                    await self.registration.showNotification(notif.title, {
                        body: notif.message,
                        icon: '/nassim/logo.jpg',
                        badge: '/nassim/logo.jpg',
                        vibrate: [200, 100, 200, 100, 200],
                        tag: 'nassim-' + notif._id,
                        requireInteraction: true,
                        renotify: true,
                        timestamp: new Date(notif.createdAt).getTime(),
                        data: notif,
                        dir: 'rtl',
                        lang: 'ar',
                        actions: [
                            { action: 'open', title: 'فتح' },
                            { action: 'close', title: 'إغلاق' }
                        ]
                    });
                    console.log('✅ Notification shown:', notif.title);
                } catch (notifErr) {
                    console.error('❌ Failed to show notification:', notifErr);
                }
            }
        } else {
            console.log('ℹ️ No new unread notifications');
        }
    } catch (error) {
        console.error('❌ Error in background sync:', error);
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
    console.log('⏰ Periodic sync triggered:', event.tag);
    
    if (event.tag === 'check-notifications-periodic') {
        event.waitUntil(checkForNewNotifications());
    }
});

// Keep service worker alive
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'KEEP_ALIVE') {
        console.log('💪 Keeping SW alive');
    }
});

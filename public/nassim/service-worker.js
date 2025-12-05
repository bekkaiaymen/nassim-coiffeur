// Nassim Coiffeur - Service Worker
// Version 3.0 - Enhanced Android Notifications Support
// التطبيق النقال الاحترافي مع دعم الإشعارات حتى عند إغلاق التطبيق

const CACHE_NAME = 'nassim-v3.0';
const urlsToCache = [
    '/nassim/',
    '/nassim/index.html',
    '/nassim/nassim.css',
    '/nassim/nassim.js',
    '/nassim/favicon.svg',
    '/nassim/logo.jpg'
];

// =====================================================
// 1. INSTALL EVENT - تثبيت Service Worker
// =====================================================
self.addEventListener('install', event => {
    console.log('📦 Service Worker installing... v3.0');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('💾 Caching application assets...');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('✅ All assets cached, skipping wait phase');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('❌ Cache error during install:', err);
            })
    );
});

// =====================================================
// 2. ACTIVATE EVENT - تفعيل Service Worker
// =====================================================
self.addEventListener('activate', event => {
    console.log('⚡ Service Worker activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            console.log('🗑️ Clearing old cache versions...');
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('  Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker ready - claiming all clients');
            return self.clients.claim();
        })
    );
});

// =====================================================
// 3. FETCH EVENT - الخدمة عند الطلب
// =====================================================
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

// =====================================================
// 4. PUSH NOTIFICATION HANDLER - الإشعارات
// يعمل حتى عند إغلاق التطبيق على Android
// =====================================================
self.addEventListener('push', event => {
    console.log('🔔 Push event received - App may be closed or in background');
    console.log('📋 Push event details:', {
        hasData: !!event.data,
        timestamp: new Date().toLocaleTimeString('ar')
    });
    
    let notificationData = {
        title: 'Nassim Coiffeur',
        body: 'لديك إشعار جديد',
        icon: '/nassim/logo.jpg',
        badge: '/nassim/logo.jpg',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'nassim-notif-' + Date.now(),
        requireInteraction: true,
        silent: false,
        renotify: true
    };
    
    if (event.data) {
        try {
            const data = event.data.json();
            console.log('📨 Push JSON data parsed:', {
                title: data.title,
                message: data.message || data.body,
                type: data.type
            });
            
            notificationData = {
                ...notificationData,
                title: data.title || 'Nassim Coiffeur',
                body: data.message || data.body || 'لديك إشعار جديد',
                data: data,
                tag: `nassim-${data.type || 'notif'}-${Date.now()}`,
                image: data.icon || '/nassim/logo.jpg'
            };
        } catch (e) {
            console.error('❌ JSON parse failed, using text:', e);
            if (event.data) {
                notificationData.body = event.data.text() || 'لديك إشعار جديد';
            }
        }
    }
    
    event.waitUntil(
        (async () => {
            try {
                console.log('📲 Showing notification:', notificationData.title);
                await self.registration.showNotification(notificationData.title, {
                    body: notificationData.body,
                    icon: notificationData.icon,
                    badge: notificationData.badge,
                    vibrate: notificationData.vibrate,
                    tag: notificationData.tag,
                    requireInteraction: true,
                    silent: false,
                    renotify: true,
                    timestamp: Date.now(),
                    data: notificationData.data || {},
                    actions: [
                        { action: 'open', title: 'فتح' },
                        { action: 'close', title: 'إغلاق' }
                    ],
                    image: notificationData.image,
                    dir: 'rtl',
                    lang: 'ar'
                });
                console.log('✅ Notification shown successfully!');
                
                try {
                    await self.registration.sync.register('sync-notification-shown');
                    console.log('📌 Sync registered for notification tracking');
                } catch (syncErr) {
                    console.log('ℹ️ Sync not available:', syncErr.message);
                }
            } catch (err) {
                console.error('❌ Show notification failed:', err);
                try {
                    console.log('🔄 Attempting fallback notification...');
                    await self.registration.showNotification('Nassim Coiffeur', {
                        body: notificationData.body,
                        icon: '/nassim/logo.jpg',
                        tag: notificationData.tag,
                        requireInteraction: true
                    });
                    console.log('✅ Fallback notification shown');
                } catch (fallbackErr) {
                    console.error('❌ Fallback also failed:', fallbackErr);
                }
            }
        })()
    );
});

// =====================================================
// 5. NOTIFICATION CLICK HANDLER - النقر على الإشعار
// =====================================================
self.addEventListener('notificationclick', event => {
    console.log('👆 Notification clicked');
    console.log('   Action:', event.action);
    console.log('   Title:', event.notification.title);
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            (async () => {
                try {
                    const clientList = await clients.matchAll({ 
                        type: 'window', 
                        includeUncontrolled: true 
                    });
                    console.log('🔎 Found', clientList.length, 'window(s)');
                    
                    for (let client of clientList) {
                        if (client.url.includes('/nassim/')) {
                            console.log('✅ Focusing existing client:', client.url);
                            return await client.focus();
                        }
                    }
                    
                    console.log('📱 Opening new window to /nassim/');
                    if (clients.openWindow) {
                        return await clients.openWindow('/nassim/');
                    }
                } catch (err) {
                    console.error('❌ Error handling click:', err);
                }
            })()
        );
    } else if (event.action === 'close') {
        console.log('🚫 User closed notification');
    }
});

// =====================================================
// 6. BACKGROUND SYNC - المزامنة في الخلفية
// =====================================================
self.addEventListener('sync', event => {
    console.log('🔄 Background Sync Event triggered:', event.tag);
    
    if (event.tag === 'check-notifications' || 
        event.tag === 'sync-notification' ||
        event.tag === 'sync-notification-shown') {
        event.waitUntil(
            checkForNewNotifications()
                .then(() => console.log('✅ Sync completed'))
                .catch(err => {
                    console.error('❌ Sync error:', err);
                    throw err;
                })
        );
    }
});

// =====================================================
// 7. PERIODIC SYNC - المزامنة الدورية
// =====================================================
self.addEventListener('periodicsync', event => {
    console.log('⏰ Periodic Sync triggered:', event.tag);
    
    if (event.tag === 'check-notifications-periodic' ||
        event.tag === 'nassim-periodic-check') {
        event.waitUntil(
            checkForNewNotifications()
                .then(() => console.log('✅ Periodic sync completed'))
                .catch(err => console.error('❌ Periodic sync error:', err))
        );
    }
});

// =====================================================
// 8. MESSAGE HANDLER - استقبال الرسائل من التطبيق
// =====================================================
self.addEventListener('message', event => {
    console.log('💬 Message from client:', event.data?.type);
    
    if (event.data && event.data.type === 'GET_TOKEN' && event.ports && event.ports[0]) {
        const token = localStorage.getItem('token');
        console.log('   Responding with token:', token ? 'present' : 'missing');
        event.ports[0].postMessage(token);
    } 
    else if (event.data && event.data.type === 'GET_CUSTOMER_ID' && event.ports && event.ports[0]) {
        const customerId = localStorage.getItem('customerId');
        console.log('   Responding with customer ID:', customerId ? 'present' : 'missing');
        event.ports[0].postMessage(customerId);
    }
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function checkForNewNotifications() {
    console.log('\n🔍 === START: checkForNewNotifications() ===');
    
    try {
        const token = await getTokenFromStorage();
        if (!token) {
            console.warn('⚠️ [STOP] No token found for API call');
            return;
        }
        console.log('✅ Token retrieved:', token.substring(0, 20) + '...');
        
        const customerId = await getCustomerIdFromStorage();
        if (!customerId) {
            console.warn('⚠️ [STOP] No customer ID found for API call');
            return;
        }
        console.log('✅ Customer ID retrieved:', customerId);
        
        const API_URL = 'https://nassim-coiffeur.onrender.com/api';
        const endpoint = `${API_URL}/notifications/check-unread/${customerId}`;
        console.log('📡 Calling API:', endpoint);
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });
        
        console.log('📊 API Response Status:', response.status);
        
        if (!response.ok) {
            console.warn(`⚠️ API returned ${response.status}: ${response.statusText}`);
            return;
        }
        
        const data = await response.json();
        console.log('📦 API Response:', {
            success: data.success,
            count: data.data?.length || 0
        });
        
        if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
            console.log(`📬 Found ${data.data.length} new notification(s)`);
            
            for (const notif of data.data) {
                try {
                    console.log(`\n📲 Processing notification: "${notif.title}"`);
                    
                    await self.registration.showNotification(
                        notif.title || 'Nassim Coiffeur',
                        {
                            body: notif.message || 'لديك إشعار جديد',
                            icon: '/nassim/logo.jpg',
                            badge: '/nassim/logo.jpg',
                            vibrate: [200, 100, 200, 100, 200],
                            tag: `nassim-${notif._id || Date.now()}`,
                            requireInteraction: true,
                            renotify: true,
                            timestamp: new Date(notif.createdAt).getTime(),
                            data: notif || {},
                            dir: 'rtl',
                            lang: 'ar',
                            actions: [
                                { action: 'open', title: 'فتح' },
                                { action: 'close', title: 'إغلاق' }
                            ]
                        }
                    );
                    console.log(`   ✅ Notification shown successfully`);
                } catch (notifErr) {
                    console.error(`   ❌ Failed to show notification:`, notifErr);
                }
            }
        } else {
            console.log('ℹ️ No new notifications at this time');
        }
    } catch (error) {
        console.error('❌ [ERROR] checkForNewNotifications() failed:', error);
        throw error;
    }
    
    console.log('✅ === END: checkForNewNotifications() ===\n');
}

async function getTokenFromStorage() {
    try {
        console.log('🔐 Getting token from storage...');
        
        try {
            const db = await openIndexedDB();
            const token = await getFromDB(db, 'token');
            if (token) {
                console.log('  ✅ Found token in IndexedDB');
                return token;
            }
        } catch (e) {
            console.log('  ℹ️ IndexedDB not available');
        }
        
        const allClients = await clients.matchAll({ 
            type: 'window', 
            includeUncontrolled: true 
        });
        console.log(`  Found ${allClients.length} client(s) to query`);
        
        for (let i = 0; i < allClients.length; i++) {
            try {
                const client = allClients[i];
                const msgChannel = new MessageChannel();
                client.postMessage({ type: 'GET_TOKEN' }, [msgChannel.port2]);
                
                const token = await new Promise((resolve) => {
                    const timeout = setTimeout(() => resolve(null), 1000);
                    msgChannel.port1.onmessage = (event) => {
                        clearTimeout(timeout);
                        resolve(event.data);
                    };
                });
                
                if (token) {
                    console.log('  ✅ Got token from client');
                    return token;
                }
            } catch (e) {
                console.log(`  ❌ Failed to query client ${i + 1}`);
            }
        }
        
        console.warn('  ⚠️ No token available');
        return null;
    } catch (e) {
        console.error('❌ Token retrieval failed:', e);
        return null;
    }
}

async function getCustomerIdFromStorage() {
    try {
        console.log('👤 Getting customer ID from storage...');
        
        try {
            const db = await openIndexedDB();
            const customerId = await getFromDB(db, 'customerId');
            if (customerId) {
                console.log('  ✅ Found customer ID in IndexedDB');
                return customerId;
            }
        } catch (e) {
            console.log('  ℹ️ IndexedDB not available');
        }
        
        const allClients = await clients.matchAll({ 
            type: 'window', 
            includeUncontrolled: true 
        });
        console.log(`  Found ${allClients.length} client(s) to query`);
        
        for (let i = 0; i < allClients.length; i++) {
            try {
                const client = allClients[i];
                const msgChannel = new MessageChannel();
                client.postMessage({ type: 'GET_CUSTOMER_ID' }, [msgChannel.port2]);
                
                const customerId = await new Promise((resolve) => {
                    const timeout = setTimeout(() => resolve(null), 1000);
                    msgChannel.port1.onmessage = (event) => {
                        clearTimeout(timeout);
                        resolve(event.data);
                    };
                });
                
                if (customerId) {
                    console.log('  ✅ Got customer ID from client');
                    return customerId;
                }
            } catch (e) {
                console.log(`  ❌ Failed to query client ${i + 1}`);
            }
        }
        
        console.warn('  ⚠️ No customer ID available');
        return null;
    } catch (e) {
        console.error('❌ Customer ID retrieval failed:', e);
        return null;
    }
}

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('nassim-db', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

function getFromDB(db, key) {
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(['appdata'], 'readonly');
            const store = transaction.objectStore('appdata');
            const request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        } catch (e) {
            reject(e);
        }
    });
}

console.log('✅ Service Worker v3.0 script loaded and ready');

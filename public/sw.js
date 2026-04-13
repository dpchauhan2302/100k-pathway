/**
 * 100K Pathway - Service Worker for Performance
 * Caching strategy for fast page loads
 */

const CACHE_NAME = '100k-pathway-v2';
const OFFLINE_PAGE = '/offline.html';
const STATIC_CACHE = [
    '/',
    '/index.html',
    '/pricing',
    '/apply',
    '/how-it-works',
    '/faq',
    '/offline.html',
    '/global-nav.css',
    '/performance-mobile-fix.css',
    '/premium-enhancements.js',
    '/manifest.json'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_CACHE))
            .then(() => self.skipWaiting())
    );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip external requests
    if (!event.request.url.startsWith(self.location.origin)) return;
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                
                return fetch(event.request).then((response) => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    
                    return response;
                }).catch(() => {
                    // Return offline page for HTML requests
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match(OFFLINE_PAGE);
                    }
                });
            })
    );
});

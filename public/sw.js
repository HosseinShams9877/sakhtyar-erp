// ─── Service Worker - سامانه ERP مصالح عمرانی ───
const CACHE_VERSION = 'erp-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const DASHBOARD_CACHE = `${CACHE_VERSION}-dashboard`;

const STATIC_ASSETS = ['/_next/static/', '/fonts/', '/logo.svg', '/manifest.json', '/offline.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(['/offline.html', '/logo.svg', '/manifest.json']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // استاتیک: Cache-First
  if (STATIC_ASSETS.some((a) => url.pathname.startsWith(a)) || url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) { const clone = response.clone(); caches.open(STATIC_CACHE).then((c) => c.put(request, clone)); }
        return response;
      }))
    );
    return;
  }

  // API: Network-First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) { const clone = response.clone(); caches.open(API_CACHE).then((c) => c.put(request, clone)); }
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || new Response(JSON.stringify({ error: 'آفلاین' }), { headers: { 'Content-Type': 'application/json' }, status: 503 })))
    );
    return;
  }

  // صفحات: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) { const clone = response.clone(); caches.open(DASHBOARD_CACHE).then((c) => c.put(request, clone)); }
        return response;
      }).catch(() => cached || caches.match('/offline.html'));
      return cached || fetchPromise;
    })
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') { event.waitUntil(syncPendingData()); }
});

async function syncPendingData() {
  // ارسال درخواست‌های معلق هنگام بازگشت آنلاین
}

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'سامانه ERP', body: 'نوتیفیکیشن جدید' };
  event.waitUntil(
    self.registration.showNotification(data.title, { body: data.body, dir: 'rtl', lang: 'fa', icon: '/logo.svg' })
  );
});

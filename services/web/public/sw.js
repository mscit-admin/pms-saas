/* عامل خدمة PMS — يتيح عرض اللوحة (للقراءة) دون اتصال بتخزين آخر بيانات مُحمّلة.
 * استراتيجية:
 *   - أصول Next الثابتة/الخطوط: مخزّن أولاً (cache-first) — هاشها ثابت.
 *   - صفحات التنقّل: شبكة أولاً ثم قشرة التطبيق المخزّنة عند الانقطاع.
 *   - بيانات الـ API (GET): شبكة أولاً، واحتياط للنسخة المخزّنة عند الانقطاع.
 *   - عمليات الكتابة (POST/PUT/...): لا تُخزَّن — الوضع للقراءة فقط دون اتصال.
 */
const VERSION = 'v1';
const SHELL = `pms-shell-${VERSION}`;
const ASSET = `pms-asset-${VERSION}`;
const DATA = `pms-data-${VERSION}`;
const KEEP = [SHELL, ASSET, DATA];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/login']).catch(() => {})));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// رسالة من الواجهة لمسح كل المخزّن (عند الخروج أو سحب الصلاحية)
self.addEventListener('message', (event) => {
  if (event.data === 'pms-clear-offline') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // قراءة فقط
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL, '/'));
    return;
  }
  if (url.pathname.startsWith('/_next/static/') || /\.(?:js|css|woff2?|png|svg|ico|json)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, ASSET));
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, DATA));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request, cacheName, fallbackPath) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(request)) || (fallbackPath && (await cache.match(fallbackPath)));
    if (hit) return hit;
    throw err;
  }
}

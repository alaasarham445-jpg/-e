const VERSION = 'v1.0.0';
const CACHE = 'chain-' + VERSION;
const LOCAL = ['./', 'index.html', 'check.html', 'storage.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'maskable-192.png', 'maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png'];
const THREE = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap';
const HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(LOCAL.map(u => c.add(new Request(u, { cache: 'reload' }))));
    try { await c.put(THREE, await fetch(THREE, { mode: 'no-cors' })); } catch (_) {}
    try {
      const r = await fetch(FONT_CSS);
      const css = await r.clone().text();
      await c.put(FONT_CSS, r);
      const urls = [...new Set((css.match(/https:\/\/fonts\.gstatic\.com[^)'"\s]+/g) || []))];
      await Promise.all(urls.map(u => fetch(u).then(x => c.put(u, x)).catch(() => {})));
    } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin && !HOSTS.includes(u.hostname)) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(r, { ignoreSearch: true });
    const net = fetch(r).then(res => {
      if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (r.mode === 'navigate') return (await c.match('index.html')) || Response.error();
    return Response.error();
  })());
});

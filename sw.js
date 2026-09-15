const CACHE = 'scorecard-v6';
const TILES = 'scorecard-tiles';
const MAX_TILES = 1500;
const CORE = ['./', 'index.html', 'app.js', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function trim() {
  const c = await caches.open(TILES); const keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await c.delete(keys[i]);
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname.includes('overpass-api') || url.hostname.includes('golfcourseapi')) return;

  // Map tiles: cache first, they never change
  if (url.hostname.includes('arcgisonline.com')) {
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r && (r.ok || r.type === 'opaque')) { c.put(e.request, r.clone()); trim(); }
      return r;
    }));
    return;
  }

  // The app itself: always try for the newest version, fall back to the saved copy with no signal
  e.respondWith(caches.open(CACHE).then(async c => {
    try {
      const r = await fetch(e.request, { cache: 'no-store' });
      if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone());
      return r;
    } catch {
      return (await c.match(e.request, { ignoreSearch: true })) || (await c.match('index.html'));
    }
  }));
});

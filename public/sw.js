// neredeucuz service worker — basit network-first (çevrimdışı yedekli).
const CACHE = 'neredeucuz-v1'
const CEKIRDEK = ['/', '/index.html', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CEKIRDEK)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  // API isteklerini önbelleğe alma — her zaman güncel fiyat
  if (request.method !== 'GET' || request.url.includes('/api/')) return

  e.respondWith(
    fetch(request)
      .then((res) => {
        const kopya = res.clone()
        caches.open(CACHE).then((c) => c.put(request, kopya)).catch(() => {})
        return res
      })
      .catch(() => caches.match(request).then((r) => r || caches.match('/index.html')))
  )
})

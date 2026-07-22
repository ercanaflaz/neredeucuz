// neredeucuz service worker — network-first (çevrimdışı yedekli) + push bildirimi.
// SÜRÜM: her deploy'da eski önbellek temizlensin diye yükselt.
const CACHE = 'neredeucuz-v3'
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

// ---- PUSH BİLDİRİMİ ----
self.addEventListener('push', (e) => {
  let veri = {}
  try { veri = e.data ? e.data.json() : {} } catch { veri = { body: e.data ? e.data.text() : '' } }
  const baslik = veri.title || veri.baslik || 'neredeucuz'
  const secenek = {
    body: veri.body || veri.mesaj || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: veri.url || '/' },
    tag: veri.tag || undefined,
    renotify: !!veri.tag,
  }
  e.waitUntil(self.registration.showNotification(baslik, secenek))
})

// Bildirime tıklayınca ilgili sayfayı aç/odakla
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const hedef = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((liste) => {
      for (const c of liste) {
        if ('focus' in c) { try { c.navigate(hedef) } catch { /* yok */ } return c.focus() }
      }
      if (self.clients.openWindow) return self.clients.openWindow(hedef)
    })
  )
})

// PWA "ana ekrana ekle" mantığı.
// Android/Chromium: beforeinstallprompt'u yakalayıp tek dokunuşla yükleriz.
// iOS Safari: Apple otomatik eklemeye izin vermez → yalnızca kısa rehber gösteririz.

let _deferred = null
let cache = { yuklenebilir: false, kurulu: standalone(), ios: iosMu() }
const listeners = new Set()
const emit = () => { cache = { ...cache }; listeners.forEach((l) => l()) }

function standalone() {
  try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true } catch { return false }
}
function iosMu() {
  const ua = navigator.userAgent || ''
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function subscribePWA(l) { listeners.add(l); return () => listeners.delete(l) }
export function getPWA() { return cache }

export function pwaBaslat() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    _deferred = e
    cache.yuklenebilir = true; emit()
  })
  window.addEventListener('appinstalled', () => {
    _deferred = null
    cache.yuklenebilir = false; cache.kurulu = true; emit()
  })
}

// Android/masaüstü: sistemin yükleme penceresini aç (tek dokunuş).
export async function pwaYukle() {
  if (!_deferred) return { yok: true }
  _deferred.prompt()
  let sonuc = {}
  try { sonuc = await _deferred.userChoice } catch { /* yok */ }
  _deferred = null
  cache.yuklenebilir = false; emit()
  return sonuc
}

// Anonim ziyaretçi/olay takibi (KVKK dostu).
// - Ziyaretçi kimliği: cihazda kalıcı rastgele kimlik (kişisel veri değil).
// - Oturum: 30 dk hareketsizlikte yenilenir.
// - "Nereden geldi": ilk referrer + utm parametreleri (Direkt/Google/Instagram...).
// - "Nereden" (coğrafya): sunucuda Cloudflare ekler; istemci konum İSTEMEZ.
// - İzin: kullanıcı "Reddet" derse hiç gönderilmez; tarayıcı DNT=1 ise gönderilmez.

const K_ZID = 'ne_zid'          // ziyaretçi kimliği (kalıcı)
const K_SID = 'ne_sid'          // oturum kimliği
const K_SID_TS = 'ne_sid_ts'    // son etkinlik zamanı
const K_KAYNAK = 'ne_kaynak'    // oturum kaynağı (referrer/utm'den)
const K_IZIN = 'ne_izin'        // 'evet' | 'hayir' (null = varsayılan izinli, anonim)
const OTURUM_MS = 30 * 60 * 1000

function uuid() {
  try { if (crypto?.randomUUID) return crypto.randomUUID() } catch { /* yok */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
function ls(k) { try { return localStorage.getItem(k) } catch { return null } }
function lsSet(k, v) { try { localStorage.setItem(k, v) } catch { /* yok */ } }

export function izinDurumu() { return ls(K_IZIN) }        // null | 'evet' | 'hayir'
export function izinVer(deger) { lsSet(K_IZIN, deger ? 'evet' : 'hayir') }
function izinliMi() {
  if (ls(K_IZIN) === 'hayir') return false
  try { if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return false } catch { /* yok */ }
  return true
}

function ziyaretciId() {
  let z = ls(K_ZID)
  if (!z) { z = uuid(); lsSet(K_ZID, z) }
  return z
}

function oturumId() {
  const now = Date.now()
  const ts = parseInt(ls(K_SID_TS) || '0', 10)
  let sid = ls(K_SID)
  const yeni = !sid || !ts || now - ts > OTURUM_MS
  if (yeni) { sid = uuid(); lsSet(K_SID, sid) }
  lsSet(K_SID_TS, String(now))
  return { sid, yeni }
}

// referrer + utm'den okunur kaynak adı üret
function kaynakBul() {
  const p = new URLSearchParams(window.location.search)
  const utm = {}
  ;['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => {
    const v = p.get(k); if (v) utm[k.replace('utm_', '')] = v
  })
  if (utm.source) return { kaynak: kibarKaynak(utm.source), utm }

  const ref = document.referrer || ''
  if (!ref) return { kaynak: 'Direkt', utm }
  let host = ''
  try { host = new URL(ref).hostname.replace(/^www\./, '') } catch { /* yok */ }
  if (!host || host === location.hostname) return { kaynak: 'Direkt', utm }
  return { kaynak: kibarKaynak(host), utm, referrer: ref }
}
function kibarKaynak(h) {
  const s = String(h).toLowerCase()
  if (s.includes('google')) return 'Google'
  if (s.includes('instagram')) return 'Instagram'
  if (s.includes('facebook') || s === 'fb.com' || s.includes('fb.me')) return 'Facebook'
  if (s.includes('youtube') || s.includes('youtu.be')) return 'YouTube'
  if (s.includes('tiktok')) return 'TikTok'
  if (s.includes('whatsapp') || s.includes('wa.me')) return 'WhatsApp'
  if (s.includes('twitter') || s === 't.co' || s === 'x.com') return 'X'
  if (s.includes('bing')) return 'Bing'
  if (s.includes('yandex')) return 'Yandex'
  if (s.includes('telegram') || s === 't.me') return 'Telegram'
  return h.length > 40 ? h.slice(0, 40) : h
}

// oturum kaynağını bir kez sakla (ilk giriş kazanır)
function oturumKaynagi(yeniOturum) {
  if (yeniOturum) {
    const { kaynak, utm, referrer } = kaynakBul()
    const paket = { kaynak, utm, referrer: referrer || '' }
    lsSet(K_KAYNAK, JSON.stringify(paket))
    return paket
  }
  try { return JSON.parse(ls(K_KAYNAK) || '{}') } catch { return {} }
}

function cihazBilgisi() {
  const ua = navigator.userAgent || ''
  let cihaz = 'masaüstü'
  if (/ipad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) cihaz = 'tablet'
  else if (/mobi|iphone|ipod|android.*mobile|phone/i.test(ua)) cihaz = 'mobil'

  let tarayici = 'Diğer'
  if (/edg\//i.test(ua)) tarayici = 'Edge'
  else if (/opr\/|opera/i.test(ua)) tarayici = 'Opera'
  else if (/samsungbrowser/i.test(ua)) tarayici = 'Samsung'
  else if (/chrome|crios/i.test(ua)) tarayici = 'Chrome'
  else if (/firefox|fxios/i.test(ua)) tarayici = 'Firefox'
  else if (/safari/i.test(ua)) tarayici = 'Safari'

  let isletim = 'Diğer'
  if (/windows/i.test(ua)) isletim = 'Windows'
  else if (/iphone|ipad|ipod/i.test(ua)) isletim = 'iOS'
  else if (/mac os x/i.test(ua)) isletim = 'macOS'
  else if (/android/i.test(ua)) isletim = 'Android'
  else if (/linux/i.test(ua)) isletim = 'Linux'

  let ekran = ''
  try { ekran = `${window.screen.width}x${window.screen.height}` } catch { /* yok */ }
  const dil = (navigator.language || '').slice(0, 12)
  return { cihaz, tarayici, isletim, ekran, dil }
}

let _uid = null
export function izlemeKullanici(id) { _uid = id || null }  // giriş yapınca App çağırır

// Ana olay gönderici (ateşle-unut). tur: 'sayfa'|'urun'|'arama'|'barkod'|'liste'|'sepet'...
export function izle(tur, veri = {}) {
  if (typeof window === 'undefined' || !izinliMi()) return
  try {
    const zid = ziyaretciId()
    const { sid, yeni } = oturumId()
    const kaynak = oturumKaynagi(yeni)
    const c = cihazBilgisi()
    const gonderi = {
      zid, sid, tur,
      yol: veri.yol != null ? veri.yol : (location.hash || '#/'),
      baslik: veri.baslik || null,
      detay: veri.detay || null,
      uid: _uid,
      kaynak: kaynak.kaynak || 'Direkt',
      referrer: kaynak.referrer || document.referrer || '',
      utm: kaynak.utm || null,
      ...c,
    }
    const govde = JSON.stringify(gonderi)
    // sendBeacon: sayfa kapanırken bile güvenli
    if (navigator.sendBeacon) {
      const blob = new Blob([govde], { type: 'application/json' })
      if (navigator.sendBeacon('/api/izle', blob)) return
    }
    fetch('/api/izle', { method: 'POST', headers: { 'content-type': 'application/json' }, body: govde, keepalive: true }).catch(() => {})
  } catch { /* sessiz */ }
}

// Sayfa görüntüleme — App yönlendirme değişince çağırır.
let _sonYol = null
export function sayfaIzle(yol, baslik) {
  const y = yol || location.hash || '#/'
  if (y === _sonYol) return
  _sonYol = y
  izle('sayfa', { yol: y, baslik: baslik || null })
}

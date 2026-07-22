// Web Push aboneliği (istemci tarafı).
// İzin ister → PushManager.subscribe → aboneliği Supabase'e kaydeder.
// Gönderim sunucuda (functions/api/push-gonder.js) yapılır.
import { supabase } from './supabase'
import { getAuth } from './auth'

// VAPID public anahtarı — GİZLİ DEĞİL, istemcide durabilir.
const VAPID_PUBLIC = 'BHr3k7Bc7p8vNjYvNEMjsTILRd_Kx6t7T1KFPRAM2jERDT2W9w7E0l40j9OnCBr1aAq5_r4GsxbBh6Otg3iZJiM'

export function pushDestekli() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}
export function pushIzin() {
  try { return Notification.permission } catch { return 'default' } // 'granted'|'denied'|'default'
}
// iOS'ta push YALNIZCA ana ekrana eklenmiş (standalone) PWA'da çalışır
export function iosStandaloneGerekli() {
  const ua = navigator.userAgent || ''
  const ios = /iphone|ipad|ipod/i.test(ua)
  const standalone = window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
  return ios && !standalone
}

function b64ToU8(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const b = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export async function pushAboneMi() {
  if (!pushDestekli()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    return !!(await reg.pushManager.getSubscription())
  } catch { return false }
}

// İzin iste + abone ol + Supabase'e kaydet.
// force:true → varsa eski aboneliği bırakıp SIFIRDAN abone olur (iOS'ta eski
// önbelleğe alınmış ölü aboneliğin yeniden kullanılmasını önler).
// HATALAR ARTIK YUTULMAZ — her adım net bir mesajla fırlatılır ki arayüzde
// (özellikle iPhone'da) nerede takıldığı görülebilsin. Başarıda endpoint döner.
export async function pushAc({ force = true } = {}) {
  if (!pushDestekli()) throw new Error('Bu cihaz/tarayıcı bildirim desteklemiyor')

  let izin
  try { izin = await Notification.requestPermission() }
  catch (e) { throw new Error('İzin isteği hatası: ' + (e?.message || e)) }
  if (izin !== 'granted') throw new Error('izin-yok')

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (sub && force) { try { await sub.unsubscribe() } catch { /* yoksay */ } sub = null }
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToU8(VAPID_PUBLIC),
      })
    } catch (e) {
      throw new Error('Abonelik (subscribe) hatası: ' + (e?.name ? e.name + ' — ' : '') + (e?.message || e))
    }
  }

  const j = sub.toJSON()
  const kayit = { endpoint: j.endpoint, abonelik: j, kullanici_id: getAuth().user?.id || null, cihaz: cihaz() }
  const { error } = await supabase.from('push_abonelikleri').upsert(kayit, { onConflict: 'endpoint' })
  if (error) throw new Error('Kayıt (veritabanı) hatası: ' + (error.message || error.code || JSON.stringify(error)))
  return j.endpoint
}

export async function pushKapat() {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      const ep = sub.endpoint
      await sub.unsubscribe()
      try { await supabase.from('push_abonelikleri').delete().eq('endpoint', ep) } catch { /* yoksay */ }
    }
  } catch { /* yoksay */ }
  return true
}

function cihaz() {
  const ua = navigator.userAgent || ''
  if (/ipad|tablet/i.test(ua)) return 'tablet'
  if (/mobi|iphone|android.*mobile/i.test(ua)) return 'mobil'
  return 'masaüstü'
}

// Cloudflare Pages Function — admin'in tüm abonelere push göndermesi.
// Güvenlik: sadece admin (Supabase JWT + profiller.rol='admin') gönderebilir.
// Abonelik listesini admin'in KENDİ token'ıyla okur (RLS is_admin() izin verir),
// bu yüzden ayrı bir service key GEREKMEZ.
//
// ŞİFRELEME: modern "aes128gcm" (RFC 8291) — iOS/Safari dahil çalışır.
// Eski "@pushforge/builder" ("aesgcm") Apple'da bildirim GÖSTERMİYORDU;
// yerine ../_webpush.js (Web Crypto, sıfır bağımlılık) kullanılır.
//
// Ortam değişkenleri (zaten build için var):
//   VAPID_PRIVATE_JWK   (VAPID özel JWK — GİZLİ)
//   SUPABASE_URL / VITE_SUPABASE_URL
//   SUPABASE_ANON_KEY / VITE_SUPABASE_KEY
import { pushGonder } from './_webpush.js'

const ADMIN_MAIL = 'mailto:aflazercan@gmail.com'

function conf(env) {
  return {
    url: (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, ''),
    anon: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_KEY,
    jwk: env.VAPID_PRIVATE_JWK,
  }
}

// İsteği yapan admin mi? Değilse null.
async function adminUid(url, anon, token) {
  if (!token) return null
  try {
    const u = await fetch(url + '/auth/v1/user', { headers: { apikey: anon, authorization: 'Bearer ' + token } })
      .then((r) => (r.ok ? r.json() : null))
    if (!u || !u.id) return null
    const prof = await fetch(url + `/rest/v1/profiller?id=eq.${u.id}&select=rol`, {
      headers: { apikey: anon, authorization: 'Bearer ' + token },
    }).then((r) => (r.ok ? r.json() : []))
    return prof && prof[0] && prof[0].rol === 'admin' ? u.id : null
  } catch { return null }
}

// Admin: tüm abonelere gönder.
export async function pushGonderCalis(env, token, govde) {
  const { url, anon, jwk: jwkStr } = conf(env)
  if (!url || !anon || !jwkStr) return { status: 501, body: { error: 'yapilandirma_eksik' } }
  const uid = await adminUid(url, anon, token)
  if (!uid) return { status: 403, body: { error: 'yetki_yok' } }

  const jwk = JSON.parse(jwkStr)

  // Abonelikleri ADMIN'in kendi token'ıyla oku — RLS "push admin" (is_admin())
  // admin'e tüm satırları verir; ayrı bir service key gerekmez.
  const admHead = { apikey: anon, authorization: 'Bearer ' + token }
  const abonelikler = await fetch(url + '/rest/v1/push_abonelikleri?select=endpoint,abonelik', {
    headers: admHead,
  }).then((r) => (r.ok ? r.json() : []))

  // Push'a tıklayınca gidilecek yer: admin bir hedef seçtiyse o, yoksa Bildirimler sayfası
  const payload = {
    title: govde.baslik || 'neredeucuz',
    body: govde.mesaj || '',
    url: (govde.url && String(govde.url).trim()) || '/#/bildirimler',
    tag: 'duyuru',
  }

  let gonderildi = 0
  const olu = []
  const detay = [] // teşhis: her endpoint için ana bilgisayar + durum
  for (const s of abonelikler) {
    let durum = 0
    try {
      durum = await pushGonder({ jwk, subject: ADMIN_MAIL, subscription: s.abonelik, payload })
      if (durum >= 200 && durum < 300) gonderildi++
      else if (durum === 404 || durum === 410) olu.push(s.endpoint)
    } catch { durum = -1 }
    try { detay.push({ host: new URL(s.endpoint).host, durum }) } catch { detay.push({ host: '?', durum }) }
  }
  // ölü abonelikleri temizle (RLS delete politikası herkese açık)
  for (const ep of olu) {
    try {
      await fetch(url + '/rest/v1/push_abonelikleri?endpoint=eq.' + encodeURIComponent(ep), {
        method: 'DELETE', headers: admHead,
      })
    } catch { /* yok */ }
  }

  // Uygulama içi geçmişe yaz (rapor için ulaşan/toplam sayılarıyla).
  try {
    await fetch(url + '/rest/v1/bildirimler', {
      method: 'POST',
      headers: { ...admHead, 'content-type': 'application/json', prefer: 'return=minimal' },
      body: JSON.stringify({
        kullanici_id: null, baslik: govde.baslik || 'neredeucuz', govde: govde.mesaj || '',
        url: govde.url || '/#/', tur: 'duyuru', gonderildi, toplam: abonelikler.length,
      }),
    })
  } catch { /* geçmişe yazılamazsa gönderim yine de başarılı */ }

  return { status: 200, body: { gonderildi, toplam: abonelikler.length, temizlenen: olu.length, detay } }
}

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors() })
  if (request.method !== 'POST') return json({ error: 'method' }, 405)
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  let govde = {}
  try { govde = await request.json() } catch { /* boş */ }
  if (!govde.baslik && !govde.mesaj) return json({ error: 'bos_mesaj' }, 400)
  const out = await pushGonderCalis(env, token, govde)
  return json(out.body, out.status)
}

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
  }
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors() } })
}

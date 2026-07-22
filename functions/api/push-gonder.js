// Cloudflare Pages Function — admin'in tüm abonelere push göndermesi.
// Güvenlik: sadece admin (Supabase JWT + profiller.rol='admin') gönderebilir.
// Abonelik listesini admin'in KENDİ token'ıyla okur (RLS is_admin() izin verir),
// bu yüzden ayrı bir service key GEREKMEZ.
// Ortam değişkenleri (zaten build için var):
//   VAPID_PRIVATE_JWK   (pushforge private JWK — GİZLİ)
//   SUPABASE_URL / VITE_SUPABASE_URL
//   SUPABASE_ANON_KEY / VITE_SUPABASE_KEY
import { buildPushHTTPRequest } from '@pushforge/builder'

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

// Tek bir aboneliğe gönder. Dönen HTTP durumunu verir (410/404 → ölü).
export async function birineGonder(jwk, abonelik, mesaj) {
  const { endpoint, headers, body } = await buildPushHTTPRequest({
    privateJWK: jwk,
    subscription: abonelik,
    message: {
      payload: { title: mesaj.baslik || 'neredeucuz', body: mesaj.mesaj || '', url: mesaj.url || '/', tag: mesaj.tag },
      adminContact: ADMIN_MAIL,
      options: { ttl: mesaj.ttl || 86400, urgency: mesaj.urgency || 'normal' },
    },
  })
  const r = await fetch(endpoint, { method: 'POST', headers, body })
  return r.status
}

// Admin: tüm abonelere gönder.
export async function pushGonderCalis(env, token, govde) {
  const { url, anon, jwk } = conf(env)
  if (!url || !anon || !jwk) return { status: 501, body: { error: 'yapilandirma_eksik' } }
  const uid = await adminUid(url, anon, token)
  if (!uid) return { status: 403, body: { error: 'yetki_yok' } }

  // Abonelikleri ADMIN'in kendi token'ıyla oku — RLS "push admin" (is_admin())
  // admin'e tüm satırları verir; ayrı bir service key gerekmez.
  const admHead = { apikey: anon, authorization: 'Bearer ' + token }
  const abonelikler = await fetch(url + '/rest/v1/push_abonelikleri?select=endpoint,abonelik', {
    headers: admHead,
  }).then((r) => (r.ok ? r.json() : []))

  const privateJWK = JSON.parse(jwk)
  const mesaj = { baslik: govde.baslik, mesaj: govde.mesaj, url: govde.url || '/', tag: 'duyuru' }
  let gonderildi = 0
  const olu = []
  for (const s of abonelikler) {
    try {
      const durum = await birineGonder(privateJWK, s.abonelik, mesaj)
      if (durum >= 200 && durum < 300) gonderildi++
      else if (durum === 404 || durum === 410) olu.push(s.endpoint)
    } catch { /* atla */ }
  }
  // ölü abonelikleri temizle (RLS delete politikası herkese açık)
  for (const ep of olu) {
    try {
      await fetch(url + '/rest/v1/push_abonelikleri?endpoint=eq.' + encodeURIComponent(ep), {
        method: 'DELETE', headers: admHead,
      })
    } catch { /* yok */ }
  }
  return { status: 200, body: { gonderildi, toplam: abonelikler.length, temizlenen: olu.length } }
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

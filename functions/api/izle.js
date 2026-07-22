// Cloudflare Pages Function — anonim ziyaretçi olay kaydı.
// İstemci POST /api/izle ile olay gönderir; fonksiyon Cloudflare'in verdiği
// coğrafya bilgisini (ülke/şehir/bölge/koordinat) EKLER ve Supabase'e yazar.
// Ham IP ASLA saklanmaz (KVKK dostu).
//
// Ortam değişkenleri (Pages > Settings > Environment variables):
//   SUPABASE_URL          (veya VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_KEY  (yoksa SUPABASE_ANON_KEY / VITE_SUPABASE_KEY kullanılır)

function sbConf(env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_KEY
  return { url, key }
}

// Ortak: gövde + coğrafyayı birleştirip Supabase'e yazar. Dev middleware de bunu kullanır.
export async function olayKaydet(env, gonderi, cf) {
  const { url, key } = sbConf(env)
  if (!url || !key) return { status: 501, body: { error: 'no_supabase' } }

  const g = cf || {}
  const kayit = {
    ziyaretci_id: str(gonderi.zid, 64) || 'anon',
    oturum_id:    str(gonderi.sid, 64) || 'anon',
    tur:          str(gonderi.tur, 24) || 'olay',
    yol:          str(gonderi.yol, 300),
    baslik:       str(gonderi.baslik, 300),
    detay:        gonderi.detay && typeof gonderi.detay === 'object' ? gonderi.detay : null,
    kullanici_id: uuidOrNull(gonderi.uid),
    kaynak:       str(gonderi.kaynak, 80),
    referrer:     str(gonderi.referrer, 500),
    utm:          gonderi.utm && typeof gonderi.utm === 'object' ? gonderi.utm : null,
    // --- Cloudflare coğrafya (ham IP DEĞİL) ---
    ulke:  str(g.country, 8),
    sehir: str(g.city, 120),
    bolge: str(g.region, 120),
    enlem: num(g.latitude),
    boylam: num(g.longitude),
    // --- istemci cihaz bilgisi ---
    cihaz:    str(gonderi.cihaz, 20),
    tarayici: str(gonderi.tarayici, 40),
    isletim:  str(gonderi.isletim, 40),
    ekran:    str(gonderi.ekran, 20),
    dil:      str(gonderi.dil, 12),
  }

  try {
    const r = await fetch(url.replace(/\/$/, '') + '/rest/v1/olaylar', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: key,
        authorization: 'Bearer ' + key,
        prefer: 'return=minimal',
      },
      body: JSON.stringify(kayit),
    })
    if (!r.ok) return { status: 200, body: { ok: false, kod: r.status } }
    return { status: 204, body: null }
  } catch (e) {
    return { status: 200, body: { ok: false, hata: String(e) } }
  }
}

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors() })
  if (request.method !== 'POST') return json({ error: 'method' }, 405)
  let gonderi = {}
  try { gonderi = await request.json() } catch { /* boş */ }
  const out = await olayKaydet(env, gonderi, request.cf || {})
  if (out.status === 204) return new Response(null, { status: 204, headers: cors() })
  return json(out.body || {}, out.status)
}

// ---- yardımcılar ----
function str(v, max) {
  if (v == null) return null
  const s = String(v).trim()
  return s ? s.slice(0, max) : null
}
function num(v) {
  const n = parseFloat(v)
  return isFinite(n) ? n : null
}
function uuidOrNull(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v : null
}
function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  }
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors() } })
}

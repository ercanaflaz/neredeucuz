// Cloudflare Pages Function — barkodoku.com barkod tanıma proxy'si.
// Anahtarlar (userKey/apiKey) SUNUCUDA gizli tutulur; istemci sadece /api/barkod/<barkod> çağırır.
// Ortam değişkenleri: BARKODOKU_USER_KEY, BARKODOKU_API_KEY.
// GET /api/barkod/8699118001201 → { bulundu:true, ad:"Peçete", kaynak:"barkodoku" }

const BASE = 'https://www.barkodoku.com'
let _token = null
let _tokenExp = 0

async function getToken(env) {
  const now = Date.now()
  if (_token && now < _tokenExp) return _token
  const r = await fetch(BASE + '/api/auth/getToken', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userKey: env.BARKODOKU_USER_KEY, apiKey: env.BARKODOKU_API_KEY }),
  })
  if (!r.ok) throw new Error('auth ' + r.status)
  const d = await r.json()
  _token = d.token
  _tokenExp = now + 3.5 * 3600 * 1000 // token ~4 saat geçerli; erken yenile
  return _token
}

// Ortak çözümleyici — Cloudflare fonksiyonu ve Vite dev middleware bunu kullanır.
export async function barkodokuCoz(env, kod) {
  const b = String(kod || '').replace(/\D/g, '')
  if (b.length < 8) return { status: 400, body: { error: 'barkod' } }
  if (!env || !env.BARKODOKU_USER_KEY || !env.BARKODOKU_API_KEY) return { status: 501, body: { error: 'no_key' } }
  try {
    const token = await getToken(env)
    const r = await fetch(BASE + '/api/barcode', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ barcode: b }),
    })
    if (!r.ok) {
      // token süresi dolduysa bir kez tazeleyip yeniden dene
      if (r.status === 401) { _token = null; return barkodokuCoz(env, b) }
      return { status: 200, body: { bulundu: false } }
    }
    const arr = await r.json()
    const ad = Array.isArray(arr) && arr[0]?.text ? String(arr[0].text).trim() : ''
    if (!ad) return { status: 200, body: { bulundu: false } }
    return { status: 200, body: { bulundu: true, ad, kaynak: 'barkodoku' } }
  } catch (e) {
    return { status: 200, body: { bulundu: false, hata: String(e) } }
  }
}

export async function onRequest(context) {
  const { request, params, env } = context
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors() })
  const kod = Array.isArray(params.path) ? params.path.join('') : (params.path || '')
  const out = await barkodokuCoz(env, kod)
  return json(out.body, out.status)
}

function cors() {
  return { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-allow-headers': 'content-type' }
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors() } })
}

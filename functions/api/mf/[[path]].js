// Cloudflare Pages Function — marketfiyati API proxy.
// Tarayıcıdan gelen /api/mf/<endpoint> isteğini sunucu tarafından
// https://api.marketfiyati.org.tr/api/v2/<endpoint> adresine iletir.
// Böylece CORS sorunu olmaz ve API adresi istemciden gizlenir.

const UPSTREAM = 'https://api.marketfiyati.org.tr/api/v2'

export async function onRequest(context) {
  const { request, params } = context
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path || '')
  const url = `${UPSTREAM}/${path}`

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors() })
  }

  const init = {
    method: request.method,
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json',
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    },
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text()
  }

  try {
    const upstream = await fetch(url, init)
    const body = await upstream.text()
    return new Response(body, {
      status: upstream.status,
      headers: { 'content-type': 'application/json; charset=utf-8', ...cors() },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'upstream_error', detail: String(e) }), {
      status: 502,
      headers: { 'content-type': 'application/json', ...cors() },
    })
  }
}

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  }
}

// Cloudflare Pages Function — Google Gemini proxy (anahtar sunucuda gizli).
// İki mod:
//   mod:'liste' → serbest yazılan alışveriş listesini {items:[{terim,adet,marka}]} yapar
//   mod:'oneri' → konuşan asistan: {reply, items} döner (öneri + ürünler)
// Ortam değişkeni: GEMINI_API_KEY (Cloudflare Pages → Settings → Environment variables).
// Anahtar yoksa 501 döner; istemci basit ayrıştırıcıya düşer.

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors() })
  if (request.method !== 'POST') return json({ error: 'method' }, 405)
  const key = env.GEMINI_API_KEY
  if (!key) return json({ error: 'no_key' }, 501)

  let govde = {}
  try { govde = await request.json() } catch { /* boş */ }
  const out = await geminiCalis(key, env.GEMINI_MODEL, govde)
  return json(out.body, out.status)
}

// Ortak çağrı — Vite dev middleware de bunu (kopyasını) kullanır.
export async function geminiCalis(key, model, { metin = '', mod = 'liste', mevcut = [] } = {}) {
  if (!String(metin).trim()) return { status: 200, body: mod === 'oneri' ? { reply: '', items: [] } : { items: [] } }
  const m = model || 'gemini-2.0-flash'
  const mevcutStr = Array.isArray(mevcut) && mevcut.length ? `Kullanıcının mevcut listesi: ${mevcut.join(', ')}.` : ''

  const prompt = mod === 'oneri'
    ? 'Sen Türkiye\'de bir market alışveriş asistanısın. Kullanıcıya KISA (1-2 cümle), samimi Türkçe cevap ver ve Türk marketlerinde (BİM, A101, Migros, ŞOK) bulunabilecek SOMUT ürünler öner. ' +
      mevcutStr +
      ' Yanıtı SADECE şu JSON olarak döndür, başka metin yok: {"reply":"kısa cevabın","items":[{"terim":"aranacak sade ürün adı","adet":sayı,"marka":null}]}. Kullanıcı: ' + metin
    : 'Aşağıdaki Türkçe market alışveriş listesini JSON diziye çevir. Her öğe {"terim":"aranacak sade ürün adı","adet":sayı,"marka":"varsa marka yoksa null"}. Sadece JSON dizi döndür. Liste:\n' + metin

  const govde = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, responseMimeType: 'application/json' } })

  // Aday modeller: önce hesapta GERÇEKTEN olanları listeletiyoruz (404 olmaz).
  const gecerli = await modelListesi(key) // ["models/gemini-2.0-flash", ...] veya []
  const norm = (x) => (x.startsWith('models/') ? x : 'models/' + x)
  const adaylar = []
  if (m) adaylar.push(norm(m)) // env'de sabitlenen model
  const flash2 = gecerli.filter((n) => /flash/i.test(n) && /2\.\d/.test(n))
  const flash = gecerli.filter((n) => /flash/i.test(n))
  ;[...flash2, ...flash, ...gecerli].forEach((n) => { if (!adaylar.includes(n)) adaylar.push(n) })
  if (adaylar.length === 0) adaylar.push('models/gemini-2.0-flash', 'models/gemini-flash-latest', 'models/gemini-2.5-flash')
  const denenecek = adaylar.slice(0, 4)

  let sonHata = 'uygun model bulunamadı'
  for (const ad of denenecek) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${ad}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: govde,
        signal: AbortSignal.timeout(28000),
      })
      if (!r.ok) {
        sonHata = `${ad}: ${r.status} ${(await r.text().catch(() => '')).slice(0, 150)}`
        // 429 = kota doldu → başka model deneme (aynı kota havuzu), hemen bildir.
        if (r.status === 429) return { status: 429, body: { error: 'kota', detail: sonHata } }
        // 404/400 = model adı geçersiz → sıradakini dene. Diğer hatalarda dur.
        if (r.status === 404 || r.status === 400) continue
        break
      }
      const data = await r.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || (mod === 'oneri' ? '{}' : '[]')
      let parsed
      try { parsed = JSON.parse(text) } catch { parsed = mod === 'oneri' ? {} : [] }
      const model = ad.replace('models/', '')
      if (mod === 'oneri') return { status: 200, body: { reply: String(parsed.reply || '').trim(), items: temizle(parsed.items || []), model } }
      return { status: 200, body: { items: temizle(Array.isArray(parsed) ? parsed : (parsed.items || [])), model } }
    } catch (e) { sonHata = `${ad}: ${String(e)}` }
  }
  return { status: 502, body: { error: 'gemini', detail: sonHata } }
}

// Hesapta generateContent destekleyen modelleri listeler (isim değişikliklerine dayanıklı).
async function modelListesi(key) {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, { signal: AbortSignal.timeout(15000) })
    if (!r.ok) return []
    const d = await r.json()
    return (d.models || [])
      .filter((mm) => (mm.supportedGenerationMethods || []).includes('generateContent'))
      .map((mm) => mm.name)
  } catch { return [] }
}

function temizle(items) {
  return (items || [])
    .map((i) => ({ terim: String(i.terim || '').trim(), adet: Number(i.adet) || 1, marka: i.marka || null }))
    .filter((i) => i.terim)
}

function cors() {
  return { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST,OPTIONS', 'access-control-allow-headers': 'content-type' }
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors() } })
}

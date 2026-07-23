// Rossmann kozmetik kazıyıcı — DENEME.
// Rossmann (Magento) ürün sayfaları JSON-LD ile fiyat + stok + marka yayınlıyor.
// DİKKAT: Rossmann bot'a kısıtlı sayfa verebiliyor (WebFetch'te ürün verisi gelmedi).
// GitHub Actions'ta düz fetch çalışırsa harika; çalışmazsa (0 ürün) Playwright'e geçeriz.
//
// Fiyat Rossmann'da doğrudan TL (Gratis'teki gibi kuruş DEĞİL).

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
const BEKLE = (ms) => new Promise((r) => setTimeout(r, ms))

const KATEGORILER = (process.env.ROSSMANN_KATEGORI || 'makyaj,cilt-bakimi,sac-bakim,parfum-deodorant,kisisel-bakim')
  .split(',').map((s) => s.trim()).filter(Boolean)
const URUN_LIMIT = Number(process.env.URUN_LIMIT || 20)

async function getir(url) {
  const r = await fetch(url, {
    headers: {
      'user-agent': UA,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'tr-TR,tr;q=0.9,en;q=0.8',
    },
  })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.text()
}

function urunLinkleri(html) {
  const set = new Set()
  const re = /href="(\/[a-z0-9-]+-p-[a-z0-9]+)"/gi
  let m
  while ((m = re.exec(html))) set.add('https://www.rossmann.com.tr' + m[1])
  return [...set]
}

function jsonLdler(html) {
  const out = []
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
  let m
  while ((m = re.exec(html))) { try { out.push(JSON.parse(m[1].trim())) } catch { /* atla */ } }
  return out
}

function urunBul(ldler) {
  for (const l of ldler) {
    if (l && l['@type'] === 'Product') return l
    if (Array.isArray(l)) { const p = l.find((x) => x && x['@type'] === 'Product'); if (p) return p }
    if (l && Array.isArray(l['@graph'])) { const p = l['@graph'].find((x) => x && x['@type'] === 'Product'); if (p) return p }
  }
  return null
}

// Mağazalar arası eşleştirme anahtarı: marka + ad, boyut/birim/noktalama atılmış.
export function eslesmeAnahtar(marka, ad) {
  let s = `${marka || ''} ${ad || ''}`.toLocaleLowerCase('tr')
  s = s.replace(/\d+([.,]\d+)?\s*(ml|lt|l|gr|g|kg|cl|adet|x|li|lu|lı|'?li|'?lu)\b/gi, ' ')
  s = s.replace(/[^0-9a-zçğıöşü ]/gi, ' ').replace(/\s+/g, ' ').trim()
  return s || null
}

async function urunCek(url) {
  const html = await getir(url)
  const p = urunBul(jsonLdler(html))
  if (!p) return null
  const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers
  const fiyat = Number(offer?.price)
  return {
    magaza: 'Rossmann',
    ad: p.name || null,
    marka: (p.brand && (p.brand.name || p.brand)) || null,
    barkod: null, // Rossmann JSON-LD gerçek EAN vermiyor (gtin = kendi kodu)
    fiyat: Number.isFinite(fiyat) ? Math.round(fiyat * 100) / 100 : null,
    kart_fiyat: null,
    stok: /InStock/i.test(offer?.availability || '') ? 'var' : (offer?.availability ? 'yok' : null),
    gorsel: Array.isArray(p.image) ? p.image[0] : p.image || null,
    url,
    eslesme: eslesmeAnahtar((p.brand && (p.brand.name || p.brand)) || '', p.name || ''),
  }
}

async function supabaseYaz(kayitlar) {
  const URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY
  if (!URL || !KEY || !kayitlar.length) return { yazildi: 0, atlandi: !URL || !KEY }
  const r = await fetch(`${URL.replace(/\/$/, '')}/rest/v1/kozmetik_urunler?on_conflict=url`, {
    method: 'POST',
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(kayitlar.map((k) => ({ ...k, guncelleme: new Date().toISOString() }))),
  })
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return { yazildi: kayitlar.length }
}

async function main() {
  const hepsi = []
  for (const kat of KATEGORILER) {
    const url = `https://www.rossmann.com.tr/${kat}`
    let links = []
    try { links = urunLinkleri(await getir(url)).slice(0, URUN_LIMIT) } catch (e) { console.log(`[${kat}] liste hatası:`, e.message); continue }
    console.log(`[${kat}] ${links.length} ürün linki`)
    for (const u of links) {
      try { const urun = await urunCek(u); if (urun && urun.ad && urun.fiyat) { urun.kategori = kat; hepsi.push(urun) } } catch { /* geç */ }
      await BEKLE(350)
    }
  }
  const tekil = [...new Map(hepsi.map((u) => [u.url, u])).values()]
  console.log(`\nToplam ${tekil.length} tekil ürün.`)
  tekil.slice(0, 15).forEach((s) => console.log(`• ${s.ad} — ${s.marka} | ${s.fiyat} TL | stok:${s.stok}`))
  if (!tekil.length) console.log('UYARI: 0 ürün — Rossmann düz fetch\'i büyük ihtimalle bot ile engelliyor. Playwright gerekebilir.')
  try {
    const sonuc = await supabaseYaz(tekil)
    if (sonuc.atlandi) console.log('\n(Supabase env yok — sadece ekrana yazıldı.)')
    else console.log(`\nSupabase'e yazıldı: ${sonuc.yazildi} kayıt.`)
  } catch (e) { console.error('Supabase yazma hatası:', e.message) }
}

main().catch((e) => { console.error('HATA:', e); process.exit(1) })

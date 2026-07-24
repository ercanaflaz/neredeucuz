// Gratis kozmetik kazıyıcı — PROTOTİP.
// Gratis ürün sayfaları JSON-LD (schema.org) ile fiyat + stok + marka + barkod + link yayınlıyor.
// Bu script: arama/kategori sayfasından ürün linklerini toplar, her ürünün JSON-LD'sini
// okuyup normalize eder ve (SUPABASE_URL + SUPABASE_SERVICE_KEY varsa) Supabase'e yazar.
//
// NOT: Gratis datacenter IP'lerini kısıtlayabilir. WebFetch ile sorunsuz çekildi, GitHub
// Actions çıkışı da açıktır; engel çıkarsa residential proxy (HTTPS_PROXY env) eklenebilir.
//
// Çalıştırma:
//   node scripts/gratis-cek.mjs                 # varsayılan kategoriler, sadece ekrana yazar
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/gratis-cek.mjs   # Supabase'e yazar

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
const BEKLE = (ms) => new Promise((r) => setTimeout(r, ms))

// Hangi kelimeleri/kategorileri tarayacağız (Gratis /search?q=…)
const KELIMELER = (process.env.KELIMELER || [
  'maskara', 'ruj', 'likit ruj', 'fondöten', 'kapatıcı', 'allık', 'pudra', 'far', 'far paleti',
  'göz kalemi', 'eyeliner', 'kaş kalemi', 'oje', 'aseton', 'makyaj temizleme',
  'şampuan', 'saç kremi', 'saç maskesi', 'saç boyası', 'saç köpüğü', 'saç spreyi', 'jöle',
  'parfüm', 'deodorant', 'kolonya', 'body mist',
  'cilt kremi', 'nemlendirici', 'güneş kremi', 'temizleme jeli', 'tonik', 'serum', 'yüz maskesi',
  'göz kremi', 'el kremi', 'vücut losyonu', 'peeling',
  'duş jeli', 'sabun', 'diş macunu', 'diş fırçası', 'ağız gargarası',
  'tuvalet kağıdı', 'kağıt havlu', 'ıslak mendil', 'ped', 'bebek bezi',
  'tıraş köpüğü', 'tıraş bıçağı', 'jilet',
].join(',')).split(',').map((s) => s.trim()).filter(Boolean)
const URUN_LIMIT = Number(process.env.URUN_LIMIT || 48) // kelime başına ürün

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
  const re = /href="(\/[^"]*-p-\d+)"/g
  let m
  while ((m = re.exec(html))) set.add('https://www.gratis.com' + m[1])
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

function barkodBul(p, html) {
  const g = p?.gtin13 || p?.gtin || p?.gtin12 || p?.mpn
  if (g && /^\d{8,14}$/.test(String(g))) return String(g)
  const m = html.match(/(?:barkod|barcode)["'>:\s]{1,6}(\d{8,14})/i)
  return m ? m[1] : null
}

function fiyatNormal(v) {
  let p = Number(v)
  if (!Number.isFinite(p)) return null
  // Gratis JSON-LD fiyatı kuruş (tam sayı) cinsinden: 74900 = 749,00 TL · 9000 = 90,00 TL
  if (Number.isInteger(p) && p >= 100) p = p / 100
  return Math.round(p * 100) / 100
}

// Mağazalar arası eşleştirme anahtarı: marka + ad, boyut/birim/noktalama atılmış.
function eslesmeAnahtar(marka, ad) {
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
  // Gratis Kart (üye) fiyatı gövdede olabilir — en iyi çaba
  const kartM = html.match(/gratis\s*kart[^0-9]{0,40}(\d{1,4}[.,]\d{2})/i)
  return {
    magaza: 'Gratis',
    ad: p.name || null,
    marka: (p.brand && (p.brand.name || p.brand)) || null,
    barkod: barkodBul(p, html),
    fiyat: fiyatNormal(offer?.price),
    kart_fiyat: kartM ? Number(kartM[1].replace('.', '').replace(',', '.')) : null,
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
    headers: {
      apikey: KEY, authorization: `Bearer ${KEY}`,
      'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(kayitlar.map((k) => ({ ...k, guncelleme: new Date().toISOString() }))),
  })
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return { yazildi: kayitlar.length }
}

async function main() {
  const hepsi = []
  for (const kelime of KELIMELER) {
    const aramaUrl = `https://www.gratis.com/search?q=${encodeURIComponent(kelime)}`
    let links = []
    try { links = urunLinkleri(await getir(aramaUrl)).slice(0, URUN_LIMIT) } catch (e) { console.log(`[${kelime}] arama hatası:`, e.message); continue }
    console.log(`[${kelime}] ${links.length} ürün linki`)
    for (const u of links) {
      try {
        const urun = await urunCek(u)
        if (urun && urun.ad && urun.fiyat) { urun.kategori = kelime; hepsi.push(urun) }
      } catch (e) { /* tek ürün hatası — geç */ }
      await BEKLE(350)
    }
  }
  // Aynı ürün farklı kelimelerde çıkabilir — url'e göre tekilleştir
  const tekil = [...new Map(hepsi.map((u) => [u.url, u])).values()]
  console.log(`\nToplam ${tekil.length} tekil ürün.`)
  tekil.slice(0, 15).forEach((s) => console.log(`• ${s.ad} — ${s.marka} | ${s.fiyat} TL | stok:${s.stok} | barkod:${s.barkod}`))

  try {
    const sonuc = await supabaseYaz(tekil)
    if (sonuc.atlandi) console.log('\n(Supabase env yok — sadece ekrana yazıldı.)')
    else console.log(`\nSupabase'e yazıldı: ${sonuc.yazildi} kayıt.`)
  } catch (e) { console.error('Supabase yazma hatası:', e.message) }
}

main().catch((e) => { console.error('HATA:', e); process.exit(1) })

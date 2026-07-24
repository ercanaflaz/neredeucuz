// Eve (eveshop.com.tr) kozmetik kazıyıcı — Shopify /products.json API.
// Eve Cloudflare arkasında: datacenter/GitHub IP'sini 403'lüyor. Bu yüzden residential
// proxy (Türkiye) üzerinden geçeriz. Sadece JSON çektiğimiz için proxy trafiği çok az.
// Fiyat Shopify'da doğrudan TL (kuruş değil). Stok = variant.available (true/false).

import { ProxyAgent, fetch as pfetch } from 'undici'

const BASE = 'https://www.eveshop.com.tr/products.json'
const SAYFA_LIMIT = 250
const MAX_SAYFA = Number(process.env.EVE_MAX_SAYFA || 60) // güvenlik tavanı
const BEKLE = (ms) => new Promise((r) => setTimeout(r, ms))
// UA olmadan Shopify/Cloudflare datacenter isteğini 403'lüyor — tarayıcı UA'sı şart.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
const ISTEK_BASLIK = { accept: 'application/json', 'user-agent': UA, 'accept-language': 'tr-TR,tr;q=0.9' }

// Residential proxy (Cloudflare'i geçmek için). PROXY_SERVER=http://host:port + PROXY_USER/PASS
// Şifre Proxy-Authorization başlığıyla (token) gönderilir — URL userinfo bazı undici sürümlerinde yok sayılıyor.
let DISPATCHER
if (process.env.PROXY_SERVER) {
  const host = process.env.PROXY_SERVER.replace(/^https?:\/\//, '')
  const opts = { uri: `http://${host}` }
  if (process.env.PROXY_USER) {
    opts.token = 'Basic ' + Buffer.from(`${process.env.PROXY_USER}:${process.env.PROXY_PASS || ''}`).toString('base64')
  }
  DISPATCHER = new ProxyAgent(opts)
}

function eslesmeAnahtar(marka, ad) {
  let s = `${marka || ''} ${ad || ''}`.toLocaleLowerCase('tr')
  s = s.replace(/\d+([.,]\d+)?\s*(ml|lt|l|gr|g|kg|cl|adet|x|li|lu|lı|'?li|'?lu)\b/gi, ' ')
  s = s.replace(/[^0-9a-zçğıöşü ]/gi, ' ').replace(/\s+/g, ' ').trim()
  return s || null
}

// product_type hiyerarşisinden okunur kategori çıkar (chip'ler için)
function kategoriCoz(tip) {
  const t = (tip || '').toLocaleUpperCase('tr')
  if (/MAKYAJ/.test(t)) return 'makyaj'
  if (/C[İI]LT/.test(t)) return 'cilt bakımı'
  if (/SA[ÇC]/.test(t)) return 'saç bakım'
  if (/PARF[ÜU]M|DEODORANT|KOKU/.test(t)) return 'parfüm & deodorant'
  if (/A[ĞG]IZ|D[İI]Ş/.test(t)) return 'ağız bakım'
  if (/BEBEK/.test(t)) return 'bebek'
  if (/G[ÜU]NE[ŞS]/.test(t)) return 'güneş ürünleri'
  if (/SABUN|DU[ŞS]|BANYO/.test(t)) return 'duş & banyo'
  const segs = (tip || '').split('>').map((s) => s.trim()).filter(Boolean)
  return (segs[segs.length - 1] || 'kozmetik').toLocaleLowerCase('tr')
}

function urunCoz(p) {
  const varyantlar = (p.variants || []).filter((v) => v && v.price != null)
  if (!varyantlar.length) return null
  const fiyatlar = varyantlar.map((v) => Number(v.price)).filter((n) => Number.isFinite(n) && n > 0)
  if (!fiyatlar.length) return null
  const fiyat = Math.min(...fiyatlar)
  const stokVar = varyantlar.some((v) => v.available)
  return {
    magaza: 'Eve',
    ad: p.title || null,
    marka: p.vendor || null,
    barkod: (p.variants?.[0]?.barcode && /^\d{8,14}$/.test(String(p.variants[0].barcode))) ? String(p.variants[0].barcode) : null,
    fiyat: Math.round(fiyat * 100) / 100,
    // kart_fiyat KASITLI olarak yazılmıyor: eve-kart-cek.mjs'in doldurduğu Eve Kart
    // fiyatı toplu çekimde silinmesin (merge-duplicates yalnız verilen kolonları günceller).
    stok: stokVar ? 'var' : 'yok',
    gorsel: p.images?.[0]?.src || null,
    url: `https://www.eveshop.com.tr/products/${p.handle}`,
    kategori: kategoriCoz(p.product_type),
    eslesme: eslesmeAnahtar(p.vendor || '', p.title || ''),
  }
}

async function supabaseYaz(kayitlar) {
  const URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY
  if (!URL || !KEY || !kayitlar.length) return { yazildi: 0, atlandi: !URL || !KEY }
  // Büyük liste — 500'lük parçalar halinde yaz
  let yazildi = 0
  for (let i = 0; i < kayitlar.length; i += 500) {
    const dilim = kayitlar.slice(i, i + 500)
    const r = await fetch(`${URL.replace(/\/$/, '')}/rest/v1/kozmetik_urunler?on_conflict=url`, {
      method: 'POST',
      headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(dilim.map((k) => ({ ...k, guncelleme: new Date().toISOString() }))),
    })
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`)
    yazildi += dilim.length
  }
  return { yazildi }
}

// 429 (rate limit) / 403 gelince bekleyip yeni proxy IP'siyle tekrar dener.
async function getir(url, deneme = 0) {
  const r = await pfetch(url, { headers: ISTEK_BASLIK, dispatcher: DISPATCHER })
  if ((r.status === 429 || r.status === 403) && deneme < 8) {
    await BEKLE(3000 + deneme * 3000) // 3s, 6s, 9s... artan bekleme
    return getir(url, deneme + 1)
  }
  return r
}

async function main() {
  if (DISPATCHER) console.log(`Proxy kullanılıyor: ${process.env.PROXY_SERVER}`)
  else console.log('Proxy YOK — Eve Cloudflare arkasında, datacenter IP 403 alır. PROXY_SERVER ekleyin.')
  const hepsi = []
  let ardisikHata = 0
  for (let sayfa = 1; sayfa <= MAX_SAYFA; sayfa++) {
    let urunler = []
    try {
      const r = await getir(`${BASE}?limit=${SAYFA_LIMIT}&page=${sayfa}`)
      if (!r.ok) { console.log(`sayfa ${sayfa}: ${r.status}`); if (++ardisikHata >= 3) break; await BEKLE(4000); continue }
      urunler = (await r.json()).products || []
    } catch (e) { console.log(`sayfa ${sayfa} hata:`, e.message); if (++ardisikHata >= 3) break; continue }
    ardisikHata = 0
    if (!urunler.length) break
    for (const p of urunler) { const u = urunCoz(p); if (u && u.ad && u.fiyat) hepsi.push(u) }
    console.log(`sayfa ${sayfa}: ${urunler.length} ürün (toplam ${hepsi.length})`)
    await BEKLE(2500) // Shopify rate limit'e takılmamak için sayfalar arası nefes
  }

  const tekil = [...new Map(hepsi.map((u) => [u.url, u])).values()]
  console.log(`\nToplam ${tekil.length} tekil ürün.`)
  tekil.slice(0, 10).forEach((s) => console.log(`• ${s.ad} — ${s.marka} | ${s.fiyat} TL | stok:${s.stok}`))
  try {
    const sonuc = await supabaseYaz(tekil)
    if (sonuc.atlandi) console.log('\n(Supabase env yok — sadece ekrana yazıldı.)')
    else console.log(`\nSupabase'e yazıldı: ${sonuc.yazildi} kayıt.`)
  } catch (e) { console.error('Supabase yazma hatası:', e.message) }
}

main().catch((e) => { console.error('HATA:', e); process.exit(1) })

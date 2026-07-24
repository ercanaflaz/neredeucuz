// Rossmann kozmetik kazıyıcı — PLAYWRIGHT + PROXY.
// Rossmann düz fetch'i ve datacenter IP'lerini bot ile engelliyor (403). Bu yüzden
// headless Chromium + residential proxy ile gerçek Türk kullanıcı gibi geziyoruz.
// Fiyat Rossmann'da doğrudan TL (kuruş DEĞİL).
//
// GitHub Actions'ta: npm install playwright && npx playwright install --with-deps chromium
// Proxy secret'ları (Türkiye seçili DataImpulse residential):
//   PROXY_SERVER = http://gw.dataimpulse.com:823
//   PROXY_USER   = plan Login'i (ör. 8la2934...)
//   PROXY_PASS   = plan Password'ı

import { chromium } from 'playwright'

const BEKLE = (ms) => new Promise((r) => setTimeout(r, ms))
// Sadece çalıştığı doğrulanmış kategoriler (bazı slug'lar 404 veriyordu)
const KATEGORILER = (process.env.ROSSMANN_KATEGORI || 'makyaj,cilt-bakimi,sac-bakim,parfum-deodorant,kisisel-bakim')
  .split(',').map((s) => s.trim()).filter(Boolean)
const URUN_LIMIT = Number(process.env.URUN_LIMIT || 80)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

// Residential proxy (secret'lardan). PROXY_SERVER yoksa proxy'siz çalışır (o zaman 403 beklenir).
const proxyOpt = process.env.PROXY_SERVER
  ? { proxy: { server: process.env.PROXY_SERVER, username: process.env.PROXY_USER || undefined, password: process.env.PROXY_PASS || undefined } }
  : {}

function urunBul(ldler) {
  for (const l of ldler) {
    if (l && l['@type'] === 'Product') return l
    if (Array.isArray(l)) { const p = l.find((x) => x && x['@type'] === 'Product'); if (p) return p }
    if (l && Array.isArray(l['@graph'])) { const p = l['@graph'].find((x) => x && x['@type'] === 'Product'); if (p) return p }
  }
  return null
}

function eslesmeAnahtar(marka, ad) {
  let s = `${marka || ''} ${ad || ''}`.toLocaleLowerCase('tr')
  s = s.replace(/\d+([.,]\d+)?\s*(ml|lt|l|gr|g|kg|cl|adet|x|li|lu|lı|'?li|'?lu)\b/gi, ' ')
  s = s.replace(/[^0-9a-zçğıöşü ]/gi, ' ').replace(/\s+/g, ' ').trim()
  return s || null
}

async function jsonLdOku(page) {
  const metinler = await page.$$eval('script[type="application/ld+json"]', (els) => els.map((e) => e.textContent))
  const ld = []
  for (const t of metinler) { try { ld.push(JSON.parse(t)) } catch { /* atla */ } }
  return ld
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
  if (proxyOpt.proxy) console.log(`Proxy kullanılıyor: ${proxyOpt.proxy.server}`)
  else console.log('Proxy YOK — PROXY_SERVER secret ekli değil. Rossmann 403 verir.')

  const browser = await chromium.launch({ headless: true, ...proxyOpt })
  // Görsel/CSS/font indirme — bize sadece HTML+JSON-LD lazım. Hem hızlanır hem de
  // proxy trafiği çok daha az harcanır. Her kategoriye TAZE context (yeni proxy IP):
  // hem "another navigation to chrome-error" zincirini keser hem de timeout/403 olan
  // IP'yi bırakır.
  const yeniSayfa = async () => {
    const ctx = await browser.newContext({ userAgent: UA, locale: 'tr-TR', viewport: { width: 1366, height: 900 } })
    await ctx.route('**/*', (route) => {
      const t = route.request().resourceType()
      if (t === 'image' || t === 'media' || t === 'font' || t === 'stylesheet') return route.abort()
      return route.continue()
    })
    return { ctx, page: await ctx.newPage() }
  }
  const hepsi = []

  try {
    for (const kat of KATEGORILER) {
      const listeUrl = `https://www.rossmann.com.tr/${kat}`
      let linkler = []
      // En çok 2 deneme; her deneme yeni context (yeni IP) ile.
      for (let deneme = 0; deneme < 2 && !linkler.length; deneme++) {
        const { ctx, page } = await yeniSayfa()
        try {
          const resp = await page.goto(listeUrl, { waitUntil: 'domcontentloaded', timeout: 90000 })
          if (resp && (resp.status() === 403 || resp.status() === 429)) { console.log(`[${kat}] ${resp.status()} (deneme ${deneme + 1})`); await ctx.close(); await BEKLE(3000); continue }
          await BEKLE(600)
          // Lazy-load için sayfayı birkaç kez aşağı kaydır
          for (let s = 0; s < 12; s++) {
            await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight))
            await BEKLE(700)
          }
          linkler = await page.$$eval('a[href*="-p-"]', (as) => [...new Set(as.map((a) => a.href).filter((h) => /-p-[a-z0-9]+/i.test(h)))])
          linkler = linkler.slice(0, URUN_LIMIT)
          console.log(`[${kat}] ${linkler.length} ürün linki`)

          for (const u of linkler) {
            try {
              await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 90000 })
              const p = urunBul(await jsonLdOku(page))
              if (!p) continue
              const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers
              const fiyat = Number(offer?.price)
              const marka = (p.brand && (p.brand.name || p.brand)) || null
              if (!p.name || !Number.isFinite(fiyat)) continue
              hepsi.push({
                magaza: 'Rossmann', ad: p.name, marka, barkod: null,
                fiyat: Math.round(fiyat * 100) / 100, kart_fiyat: null,
                stok: /InStock/i.test(offer?.availability || '') ? 'var' : (offer?.availability ? 'yok' : null),
                gorsel: Array.isArray(p.image) ? p.image[0] : p.image || null,
                url: u, kategori: kat, eslesme: eslesmeAnahtar(marka || '', p.name),
              })
            } catch { /* tek ürün — geç */ }
            await BEKLE(150)
          }
        } catch (e) { console.log(`[${kat}] hata (deneme ${deneme + 1}):`, e.message) }
        finally { await ctx.close() }
      }
    }
  } finally {
    await browser.close()
  }

  const tekil = [...new Map(hepsi.map((u) => [u.url, u])).values()]
  console.log(`\nToplam ${tekil.length} tekil ürün.`)
  tekil.slice(0, 15).forEach((s) => console.log(`• ${s.ad} — ${s.marka} | ${s.fiyat} TL | stok:${s.stok}`))
  if (!tekil.length) console.log('UYARI: 0 ürün — proxy ile de gelmedi. Proxy ülkesi (Türkiye) ve secret\'ları kontrol et.')
  try {
    const sonuc = await supabaseYaz(tekil)
    if (sonuc.atlandi) console.log('\n(Supabase env yok — sadece ekrana yazıldı.)')
    else console.log(`\nSupabase'e yazıldı: ${sonuc.yazildi} kayıt.`)
  } catch (e) { console.error('Supabase yazma hatası:', e.message) }
}

main().catch((e) => { console.error('HATA:', e); process.exit(1) })

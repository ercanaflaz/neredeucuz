// Eve Kart fiyatı ZENGİNLEŞTİRME — PLAYWRIGHT + PROXY.
//
// Neden ayrı bir script? Eve Kart fiyatı products.json'da YOK; sadece ürünün HTML
// sayfasında ("Eve Kart ile 123,50 TL") var ve ürüne özel (sabit yüzde değil, %20–75
// arası değişiyor). 7000+ ürünün hepsinin sayfasını çekmek ~8 GB proxy trafiği = pahalı.
//
// Bu yüzden AKILLI yol: sadece BAŞKA MAĞAZAYLA EŞLEŞEN (karşılaştırmaya giren) ve kart
// fiyatı henüz boş olan Eve ürünlerinin sayfasını çekeriz — birkaç yüz ürün, ~birkaç yüz MB.
//
// Kart fiyatı ana ürün bölümünden (h1 + sepete-ekle formunu içeren kapsayıcı) okunur;
// böylece header promosyonu ve "benzer ürünler" karüselindeki başka kart fiyatları karışmaz.
//
// GitHub Actions'ta: npm install playwright && npx playwright install --with-deps chromium
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, PROXY_SERVER, PROXY_USER, PROXY_PASS

import { chromium } from 'playwright'

const BEKLE = (ms) => new Promise((r) => setTimeout(r, ms))
const URUN_TAVAN = Number(process.env.EVE_KART_TAVAN || 1200) // güvenlik tavanı (eşleşen Eve ürünü sayısı genelde birkaç yüz)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

const proxyOpt = process.env.PROXY_SERVER
  ? { proxy: { server: process.env.PROXY_SERVER, username: process.env.PROXY_USER || undefined, password: process.env.PROXY_PASS || undefined } }
  : {}

// ——— Eşleştirme anahtarı (frontend/kozmetik.js ile BİREBİR aynı; Türkçe ASCII katlama) ———
const ES_STOP = new Set(['ve', 'ile', 'için', 'icin', 'yeni', 'set', 'paket', 'adet', 'ml', 'lt', 'l', 'gr', 'g', 'kg', 'cl', 'x', 'li', 'lu', 'lı', 'no', 'kadın', 'kadin', 'erkek', 'bayan', 'ea', 'the'])
const TR_KATLA = { ı: 'i', İ: 'i', 'i̇': 'i', ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u', â: 'a', î: 'i', û: 'u' }
const norm = (v) => (v || '').replace(/[ıİi̇çÇğĞöÖşŞüÜâîû]/g, (c) => TR_KATLA[c] || c).toLowerCase().replace(/[^0-9a-z ]/gi, ' ').replace(/\s+/g, ' ').trim()
function anahtarUret(marka, ad) {
  const m = norm(marka)
  const markaTok = new Set(m.split(' ').filter(Boolean))
  let t = norm(ad).split(' ').filter((x) => x.length > 1 && !ES_STOP.has(x) && !markaTok.has(x))
  t = [...new Set(t)].sort()
  const k = (m + ' ' + t.join(' ')).trim()
  return k || null
}

async function supabaseOku() {
  const URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY
  if (!URL || !KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY yok')
  const hepsi = []
  for (let off = 0; off < 40000; off += 1000) {
    const r = await fetch(`${URL.replace(/\/$/, '')}/rest/v1/kozmetik_urunler?select=id,magaza,ad,marka,fiyat,kart_fiyat,url&order=id.asc&limit=1000&offset=${off}`,
      { headers: { apikey: KEY, authorization: `Bearer ${KEY}` } })
    if (!r.ok) throw new Error(`Supabase oku ${r.status}: ${(await r.text()).slice(0, 150)}`)
    const d = await r.json()
    hepsi.push(...d)
    if (d.length < 1000) break
  }
  return hepsi
}

async function kartGuncelle(id, kart) {
  const URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY
  const r = await fetch(`${URL.replace(/\/$/, '')}/rest/v1/kozmetik_urunler?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify({ kart_fiyat: kart, guncelleme: new Date().toISOString() }),
  })
  if (!r.ok) throw new Error(`Supabase güncelle ${r.status}: ${(await r.text()).slice(0, 150)}`)
}

// Eşleşen (≥2 mağaza) gruplardaki, kart fiyatı boş Eve ürünlerini bul.
function hedefleriSec(satirlar) {
  const gruplar = new Map()
  for (const r of satirlar) {
    const key = anahtarUret(r.marka, r.ad)
    if (!key) continue
    if (!gruplar.has(key)) gruplar.set(key, [])
    gruplar.get(key).push(r)
  }
  const hedef = []
  for (const grup of gruplar.values()) {
    const magazalar = new Set(grup.map((s) => s.magaza))
    if (magazalar.size < 2) continue // sadece karşılaştırmaya girenler
    for (const s of grup) {
      if (s.magaza === 'Eve' && (s.kart_fiyat == null || s.kart_fiyat <= 0) && s.fiyat > 0 && s.url) hedef.push(s)
    }
  }
  // aynı ürün birden çok grupta olabilir — url'e göre tekilleştir
  return [...new Map(hedef.map((s) => [s.url, s])).values()]
}

// Ana ürün bölümünden "Eve Kart ile X TL" fiyatını okur (karüsel/promosyon hariç).
async function kartFiyatOku(page, listFiyat) {
  return page.evaluate((list) => {
    const parse = (t) => {
      const m = (t || '').match(/([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]{1,5})(?:,([0-9]{2}))?\s*TL/i)
      if (!m) return null
      return Number(m[1].replace(/\./g, '') + (m[2] ? '.' + m[2] : ''))
    }
    const h1 = document.querySelector('h1')
    if (!h1) return null
    // h1'den yukarı çık; sepete-ekle formunu içeren kapsayıcıyı ana ürün bölümü say
    let root = h1
    for (let i = 0; i < 8 && root.parentElement; i++) {
      root = root.parentElement
      if (root.querySelector('form[action*="cart/add"], form[action*="/cart/add"]')) break
    }
    const adaylar = [...root.querySelectorAll('div,span,p,b,strong')]
      .filter((e) => /eve\s*kart\s*ile/i.test(e.textContent || ''))
      .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    for (const e of adaylar) {
      const v = parse(e.textContent)
      if (v && v > 0 && (!list || (v < list && v > list * 0.1))) return v
    }
    return null
  }, listFiyat)
}

async function main() {
  if (proxyOpt.proxy) console.log(`Proxy kullanılıyor: ${proxyOpt.proxy.server}`)
  else console.log('Proxy YOK — Eve Cloudflare arkasında, datacenter IP 403 alır. PROXY_SERVER ekleyin.')

  const satirlar = await supabaseOku()
  console.log(`Supabase'de ${satirlar.length} ürün.`)
  let hedefler = hedefleriSec(satirlar)
  console.log(`Kart fiyatı çekilecek eşleşen Eve ürünü: ${hedefler.length}`)
  if (hedefler.length > URUN_TAVAN) {
    console.log(`(Tavan ${URUN_TAVAN} — fazlası bir sonraki çalıştırmaya bırakılıyor.)`)
    hedefler = hedefler.slice(0, URUN_TAVAN)
  }
  if (!hedefler.length) { console.log('Zenginleştirilecek ürün yok — çıkılıyor.'); return }

  const browser = await chromium.launch({ headless: true, ...proxyOpt })
  // Taze context = yeni proxy IP (rotating gateway). Bloklanan IP'yi bırakmak için kullanılır.
  const yeniSayfa = async () => {
    const ctx = await browser.newContext({ userAgent: UA, locale: 'tr-TR', viewport: { width: 1366, height: 900 } })
    // Kart fiyatı sunucu HTML'inde geliyor (JS gerekmez). SADECE ana HTML belgesini
    // yükle, geri kalan her şeyi (script, xhr, görsel, css, font) blokla → sayfa çok
    // hafifler, proxy üzerinden timeout / ERR_CONNECTION_CLOSED büyük ölçüde biter.
    await ctx.route('**/*', (route) => {
      if (route.request().resourceType() !== 'document') return route.abort()
      return route.continue()
    })
    return { ctx, page: await ctx.newPage() }
  }

  let { ctx, page } = await yeniSayfa()
  let guncellenen = 0, kartYok = 0, hata = 0, ard403 = 0
  const ipYenile = async () => { try { await ctx.close() } catch { /* yok */ } await BEKLE(4000); ({ ctx, page } = await yeniSayfa()); ard403 = 0; console.log('  ↻ yeni proxy IP') }

  try {
    for (let i = 0; i < hedefler.length; i++) {
      const s = hedefler[i]
      let tamam = false
      for (let deneme = 0; deneme < 3 && !tamam; deneme++) {
        try {
          const resp = await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 45000 })
          const durum = resp ? resp.status() : 0
          if (durum === 403 || durum === 429) {
            ard403++
            if (ard403 >= 3) await ipYenile()          // arka arkaya blok → yeni IP
            else await BEKLE(2000 + deneme * 2000)
            continue                                    // aynı ürünü tekrar dene
          }
          ard403 = 0
          await BEKLE(300)
          const kart = await kartFiyatOku(page, s.fiyat)
          if (kart) { await kartGuncelle(s.id, kart); guncellenen++; if (guncellenen <= 15 || guncellenen % 25 === 0) console.log(`✓ ${s.ad} — ${s.fiyat}₺ → kart ${kart}₺`) }
          else kartYok++
          tamam = true
        } catch (e) {
          if (deneme === 2) { hata++; if (hata <= 12) console.log(`hata: ${s.url} — ${e.message}`) }
          else await BEKLE(1500 + deneme * 1500)
        }
      }
      await BEKLE(450) // istekler arası biraz daha nefes — 403 riskini azaltır
      if ((i + 1) % 50 === 0) console.log(`… ${i + 1}/${hedefler.length} (güncellenen ${guncellenen}, kart yok ${kartYok}, hata ${hata})`)
    }
  } finally {
    await browser.close()
  }
  console.log(`\nBitti. Güncellenen kart fiyatı: ${guncellenen} · kart bulunamadı: ${kartYok} · hata: ${hata}`)
}

main().catch((e) => { console.error('HATA:', e); process.exit(1) })

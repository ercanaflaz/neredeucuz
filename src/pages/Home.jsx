import { useState, useMemo, useSyncExternalStore, useEffect, useRef, lazy, Suspense } from 'react'
import { Barcode, Search, MapPin, Loader2, Flame, TrendingDown, SlidersHorizontal, ArrowLeft, RefreshCw, LayoutGrid, ChevronDown } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import AdSlot from '../components/AdSlot'
import MarketBadge from '../components/MarketBadge'
import { KATEGORILER } from '../data/kategoriler'
import { populerAramalariGetir } from '../lib/populerAramalar'
import { marka } from '../lib/markets'
import { searchByKeyword, searchByBarcode, normalize } from '../lib/marketfiyati'
import { urunOnerileri } from '../lib/oneriler'
import { barkodCoz } from '../lib/barkod'
import { tl } from '../lib/format'
import { subscribe, getSnapshot, konumIste, yaricapDegistir, YARICAP_SECENEKLERI, aramaLogla, yakinMarketleriYukle } from '../lib/store'
import { izle } from '../lib/izleme'
import ReklamYuva from '../components/ReklamYuva'
import AiAsistan from '../components/AiAsistan'
import NasilKullanilir from '../components/NasilKullanilir'
import UygulamayiYukle from '../components/UygulamayiYukle'

// Kategori alt-başlık paneli aksan renkleri (Tailwind purge için tam sınıf adları).
const AKSAN = {
  green:   { border: 'border-green-200',  cip: 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100' },
  rose:    { border: 'border-rose-200',   cip: 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100' },
  sky:     { border: 'border-sky-200',    cip: 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100' },
  amber:   { border: 'border-amber-200',  cip: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100' },
  pink:    { border: 'border-pink-200',   cip: 'bg-pink-50 border-pink-200 text-pink-800 hover:bg-pink-100' },
  violet:  { border: 'border-violet-200', cip: 'bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100' },
  teal:    { border: 'border-teal-200',   cip: 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100' },
  emerald: { border: 'border-emerald-200',cip: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100' },
}

// Barkod tarayıcı (html5-qrcode) sadece gerektiğinde yüklensin — ilk açılış hızlı.
const BarcodeScanner = lazy(() => import('../components/BarcodeScanner'))

const KAPSANAN = ['BİM', 'A101', 'ŞOK', 'Migros', 'CarrefourSA', 'Hakmar', 'Tarım Kredi']

function formatMesafe(m) {
  if (m == null) return ''
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

export default function Home({ onSelect }) {
  const store = useSyncExternalStore(subscribe, getSnapshot)
  const [q, setQ] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [toplam, setToplam] = useState(0)      // API'nin bulduğu toplam ürün (numberOfFound)
  const [sayfa, setSayfa] = useState(0)        // yüklü son sayfa
  const [dahaYuk, setDahaYuk] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState(null)
  const [tarayici, setTarayici] = useState(false)
  const [bilgi, setBilgi] = useState('')
  const [aranan, setAranan] = useState('')
  const [aktifKelime, setAktifKelime] = useState('')
  const [siralama, setSiralama] = useState('ucuz') // ucuz | fark
  const [marketFiltre, setMarketFiltre] = useState(null)
  const [urunMarka, setUrunMarka] = useState(null) // ürün markası filtresi (Sütaş, Coca-Cola...)
  const [sadeceKampanya, setSadeceKampanya] = useState(false)
  const [turFiltre, setTurFiltre] = useState(null)  // seçili alt tür (beyaz, kaşar, üçgen...)
  const [turler, setTurler] = useState([])          // tür çipleri (baz aramadan)
  const [anaKelime, setAnaKelime] = useState('')    // baz arama kelimesi (tür eklenmeden)
  const [barkodUrunId, setBarkodUrunId] = useState(null) // barkodla taranan ürün (başta gösterilir)
  // Canlı arama önerileri
  const [oneriler, setOneriler] = useState([])
  const [oneriYaziyor, setOneriYaziyor] = useState(false) // kutuda yazılıyor → açılır liste göster
  const [oneriYukleniyor, setOneriYukleniyor] = useState(false)
  const zamanlayici = useRef(null)
  // Kategoriler (açık olan alt-başlık paneli) + dinamik "en çok aranan"
  const [acikKat, setAcikKat] = useState(null)     // açık ana kategori adı
  const [populer, setPopuler] = useState([])       // gerçek arama verisinden

  // "En çok aranan"ı gerçek arama kayıtlarından yükle (yoksa statik yedek).
  useEffect(() => {
    let iptal = false
    populerAramalariGetir(12).then((liste) => { if (!iptal) setPopuler(liste) })
    return () => { iptal = true }
  }, [])

  // Sonuç başlıklarından alt tür kelimelerini çıkar (marka + arama kelimeleri hariç).
  function turleriHesapla(list, kelime) {
    const STOP = new Set(['gr', 'kg', 'ml', 'lt', 'adet', 'paket', 'gram', 've', 'ile', 'light', 'için', 'yağlı', 'yagli'])
    const aramaKel = new Set((kelime || '').toLocaleLowerCase('tr').split(/\s+/).filter(Boolean))
    const markaKel = new Set()
    list.forEach((u) => String(u.brand || '').toLocaleLowerCase('tr').split(/\s+/).forEach((w) => w && markaKel.add(w)))
    const say = new Map()
    for (const u of list) {
      const kelimeler = new Set(String(u.title || '').toLocaleLowerCase('tr').replace(/[0-9]+/g, ' ').split(/\s+/).filter(Boolean))
      for (const w of kelimeler) {
        if (w.length < 3 || aramaKel.has(w) || markaKel.has(w) || STOP.has(w)) continue
        say.set(w, (say.get(w) || 0) + 1)
      }
    }
    return [...say.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w, n]) => ({ w, n }))
  }

  // Arama motorunu çalıştır (sonuçları + toplamı ayarlar). Çipleri değiştirmez.
  async function calistir(kelime) {
    const konum = getSnapshot().konum
    setYukleniyor(true); setHata(null); setBilgi('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    try {
      const res = await searchByKeyword(kelime, konum)
      const list = normalize(res, konum)
      setSonuclar(list)
      setToplam(res?.numberOfFound || list.length)
      setSayfa(0)
      if (!list.length) setBilgi(konum ? 'Bu bölgede sonuç bulunamadı. Yarıçapı büyütmeyi ya da farklı bir kelimeyi dene.' : 'Sonuç bulunamadı. Farklı bir kelime dene.')
      return list
    } catch {
      setHata('Arama başarısız oldu. Bağlantını kontrol et.')
      return []
    } finally {
      setYukleniyor(false)
    }
  }

  // BAZ arama (üst kutu / popüler). Tür çiplerini bu sonuçtan üretir.
  async function aramaYap(kelime) {
    const k = (kelime ?? q).trim()
    if (!k) return
    setQ(k); setAktifKelime(k); setAnaKelime(k)
    setMarketFiltre(null); setUrunMarka(null); setSadeceKampanya(false); setTurFiltre(null); setBarkodUrunId(null); setTurler([])
    setToplam(0); setSayfa(0)
    oneriKapat()
    setAranan(k)
    aramaLogla(k)
    const list = await calistir(k)
    setTurler(turleriHesapla(list, k))
  }

  // Tür çipine tıkla → o türü SUNUCUDAN yeniden ara (tam liste + doğru sayı).
  async function turSec(w) {
    const yeni = turFiltre === w ? null : w
    setTurFiltre(yeni)
    const kelime = yeni ? `${w} ${anaKelime}`.trim() : anaKelime
    setAktifKelime(kelime)
    await calistir(kelime)
  }

  // Sonraki sayfayı getir ve mevcut listeye ekle (tekilleştirerek).
  async function dahaGetir() {
    if (dahaYuk || !aktifKelime) return
    const konum = getSnapshot().konum
    const yeni = sayfa + 1
    setDahaYuk(true)
    try {
      const res = await searchByKeyword(aktifKelime, konum, { page: yeni })
      const list = normalize(res, konum)
      setSonuclar((o) => {
        const ids = new Set(o.map((x) => x.id))
        return [...o, ...list.filter((x) => !ids.has(x.id))]
      })
      setSayfa(yeni)
      if (res?.numberOfFound) setToplam(res.numberOfFound)
    } catch { /* yok */ } finally { setDahaYuk(false) }
  }

  async function barkodOkundu(kod) {
    setTarayici(false)
    try { izle('barkod', { baslik: String(kod), detay: { kod: String(kod) } }) } catch { /* yok */ }
    const konum = getSnapshot().konum
    setYukleniyor(true); setHata(null); setBilgi(''); setQ(''); setAranan(`barkod: ${kod}`); setAktifKelime(''); setMarketFiltre(null); setUrunMarka(null); setSadeceKampanya(false); setTurFiltre(null); setTurler([]); setAnaKelime(''); setToplam(0); setSayfa(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    try {
      const res = await searchByBarcode(kod, konum)
      const list = normalize(res, konum)
      if (list.length) {
        const urun = list[0]
        setAranan(urun.title)
        setBarkodUrunId(urun.id)
        // Benzer ürünler (aynı ad/kategori) — kampanyalılar da burada görünür.
        let benzer = []
        try {
          const anahtar = benzerAnahtar(urun)
          if (anahtar) benzer = normalize(await searchByKeyword(anahtar, konum), konum)
        } catch { /* benzer bulunamadı — sorun değil */ }
        setSonuclar([urun, ...benzer.filter((b) => b.id !== urun.id)])
        return
      }
      // marketfiyati'de barkod yok → dış kaynaktan ürünü tanı.
      setBarkodUrunId(null)
      const disUrun = await barkodCoz(kod)
      if (disUrun?.ad) {
        const ad = disUrun.marka ? `${disUrun.marka} ${disUrun.ad}` : disUrun.ad
        setAranan(disUrun.ad)
        let benzer = []
        try { benzer = normalize(await searchByKeyword(disUrun.ad, konum), konum) } catch { /* yok */ }
        if (!benzer.length && disUrun.marka) {
          try { benzer = normalize(await searchByKeyword(ad, konum), konum) } catch { /* yok */ }
        }
        setSonuclar(benzer)
        setBilgi(
          benzer.length
            ? `📷 Okuttuğun ürün: ${disUrun.ad}${disUrun.marka ? ` (${disUrun.marka})` : ''} — kaynak: ${disUrun.kaynak}. Bu barkodla eşleşen fiyat yoktu; aşağıda benzer ürünleri getirdim.`
            : `📷 Okuttuğun ürün: ${disUrun.ad}${disUrun.marka ? ` (${disUrun.marka})` : ''} — kaynak: ${disUrun.kaynak}. Ama bu ürün fiyat verisinde bulunamadı.`,
        )
      } else {
        setSonuclar([])
        setBilgi(`Bu barkod (${kod}) fiyat verisinde ve barkod veritabanlarında bulunamadı. Ürün adıyla aramayı dene.`)
      }
    } catch {
      setHata('Barkod sorgulanamadı. Bağlantını kontrol et.')
    } finally {
      setYukleniyor(false)
    }
  }

  // Ürün adından benzer arama anahtarı üret (marka + boyut eklerini at, 2 kelime).
  function benzerAnahtar(urun) {
    let t = String(urun.title || '').toLocaleLowerCase('tr')
    t = t.replace(/\d+([.,]\d+)?\s*(kg|gr|g|ml|lt|l|cl|adet|yaprak|rulo|x)\b/gi, ' ')
    const m = String(urun.brand || '').toLocaleLowerCase('tr')
    let kelimeler = t.split(/\s+/).filter((w) => w.length > 1)
    if (m) kelimeler = kelimeler.filter((w) => !m.includes(w))
    return kelimeler.slice(0, 2).join(' ').trim()
  }

  function yaricapSec(km) {
    yaricapDegistir(km)
    if (aktifKelime) setTimeout(() => aramaYap(aktifKelime), 0)
  }

  // "Anlık fiyat" → yakın marketleri (ve arama sonucunu) canlı yenile
  const [yeniliyor, setYeniliyor] = useState(false)
  async function anlikYenile() {
    if (yeniliyor) return
    setYeniliyor(true)
    try {
      if (store.konumDurumu === 'tamam') await yakinMarketleriYukle()
      else konumIste()
      if (aktifKelime) await aramaYap(aktifKelime)
    } catch { /* yok */ }
    finally { setTimeout(() => setYeniliyor(false), 500) }
  }

  // Aramayı temizle → ana sayfa görünümüne dön.
  function aramayiTemizle() {
    setAranan(''); setAktifKelime(''); setQ(''); setSonuclar([]); setToplam(0); setSayfa(0)
    setHata(null); setBilgi(''); setMarketFiltre(null); setUrunMarka(null); setSadeceKampanya(false); setTurFiltre(null); setTurler([]); setAnaKelime(''); setBarkodUrunId(null)
    oneriKapat()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Canlı öneri: yazarken (debounce) gerçek ürünleri getir.
  useEffect(() => {
    const k = q.trim()
    if (!oneriYaziyor || k.length < 2) { setOneriler([]); setOneriYukleniyor(false); return }
    setOneriYukleniyor(true)
    clearTimeout(zamanlayici.current)
    zamanlayici.current = setTimeout(async () => {
      try {
        const konum = getSnapshot().konum
        const list = normalize(await searchByKeyword(k, konum), konum)
        setOneriler(list.slice(0, 6))
      } catch { setOneriler([]) } finally { setOneriYukleniyor(false) }
    }, 300)
    return () => clearTimeout(zamanlayici.current)
  }, [q, oneriYaziyor])

  function oneriKapat() { setOneriYaziyor(false); setOneriler([]); setOneriYukleniyor(false) }
  function oneriSec(urun) { oneriKapat(); onSelect(urun) }
  // Yazılana yakın sonuç yoksa "bunu mu dediniz" düzeltme önerileri.
  const yakinOneriler = (oneriYaziyor && !oneriYukleniyor && q.trim().length >= 2 && oneriler.length === 0) ? urunOnerileri(q, 5) : []

  // Sonuçlarda bulunan marketler (filtre çipleri için)
  const marketler = useMemo(() => {
    const s = new Set()
    sonuclar.forEach((u) => u.depots.forEach((d) => s.add(marka(d.market).ad)))
    return [...s]
  }, [sonuclar])

  // Filtre + sıralama uygulanmış liste
  // Sonuçlardaki ürün markaları (filtre için)
  const urunMarkalari = useMemo(() => {
    const s = new Set()
    sonuclar.forEach((u) => { if (u.brand) s.add(u.brand) })
    return [...s].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [sonuclar])

  const gosterilen = useMemo(() => {
    let list = sonuclar
    if (marketFiltre) list = list.filter((u) => u.depots.some((d) => marka(d.market).ad === marketFiltre))
    if (urunMarka) list = list.filter((u) => u.brand === urunMarka)
    if (sadeceKampanya) list = list.filter((u) => u.kampanyali)
    if (siralama === 'fark') {
      list = [...list].sort((a, b) => ((b.maxPrice - b.minPrice) || 0) - ((a.maxPrice - a.minPrice) || 0))
    } else {
      list = [...list].sort((a, b) => (a.minPrice ?? 1e9) - (b.minPrice ?? 1e9))
    }
    return list
  }, [sonuclar, marketFiltre, urunMarka, siralama, sadeceKampanya])

  const kampanyaSayisi = useMemo(() => sonuclar.filter((u) => u.kampanyali).length, [sonuclar])

  const aramaVar = aranan || sonuclar.length || yukleniyor

  return (
    <div className="space-y-6">
      {tarayici && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>}>
          <BarcodeScanner onDetected={barkodOkundu} onClose={() => setTarayici(false)} />
        </Suspense>
      )}

      {/* HERO */}
      <div className="rounded-3xl bg-gradient-to-br from-primary to-green-700 text-primary-content p-6 sm:p-8 lg:p-10 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm/none opacity-90 mb-2">
            <TrendingDown size={18} /> en ucuz market cebinde
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
            Bir ürün seç, <span className="text-secondary">en ucuz nerede</span> anında gör
          </h1>
          <p className="opacity-90 mt-2 text-sm lg:text-base">
            Ürün adını yaz ve <b>Ara</b>'ya bas, ya da <b>Barkodla tara</b>. BİM, A101, ŞOK, Migros ve daha fazlasını tek ekranda karşılaştır.
          </p>

          {/* Arama: net "Ara" + ayrı "Barkodla tara" (seçenekli) */}
          <form onSubmit={(e) => { e.preventDefault(); aramaYap() }} className="mt-5 space-y-2">
            <div className="relative">
              <label className="input input-lg flex items-center gap-2 w-full bg-base-100 text-base-content rounded-2xl">
                <Search size={20} className="text-base-content/40" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setOneriYaziyor(true) }}
                  onFocus={() => setOneriYaziyor(true)}
                  onBlur={() => setTimeout(oneriKapat, 150)}
                  placeholder="süt, yumurta, deterjan..."
                  className="grow"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                />
                {oneriYukleniyor && <Loader2 size={18} className="animate-spin text-base-content/30" />}
                {q && <button type="button" onClick={() => { setQ(''); setOneriYaziyor(true) }} className="text-base-content/40 text-xl leading-none px-1">×</button>}
              </label>

              {/* Canlı öneri açılır listesi */}
              {oneriYaziyor && (oneriler.length > 0 || yakinOneriler.length > 0) && (
                <div className="absolute z-30 mt-1 w-full bg-base-100 text-base-content rounded-2xl shadow-2xl border border-base-300 overflow-hidden max-h-[60vh] overflow-y-auto">
                  {oneriler.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => oneriSec(u)}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-base-200 border-b border-base-200 last:border-0"
                    >
                      <div className="w-10 h-10 rounded-lg bg-base-200 shrink-0 overflow-hidden flex items-center justify-center">
                        {u.imageUrl ? <img src={u.imageUrl} alt="" className="w-full h-full object-contain" /> : <Search size={16} className="text-base-content/30" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight line-clamp-1">{u.title}</div>
                        <div className="text-[11px] text-base-content/50 flex items-center gap-1.5">
                          {u.cheapest && <MarketBadge market={u.cheapest.market} size="sm" />}
                          {u.minPrice != null && <span className="font-semibold text-primary">{tl(u.minPrice)}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                  {yakinOneriler.length > 0 && (
                    <div className="p-2.5 space-y-1.5">
                      <div className="text-[11px] text-base-content/50">Bunu mu demek istedin?</div>
                      <div className="flex flex-wrap gap-1.5">
                        {yakinOneriler.map((t) => (
                          <button key={t} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => aramaYap(t)} className="badge badge-outline badge-primary cursor-pointer py-2.5">{t}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-lg flex-1 rounded-2xl bg-base-100 text-primary border-none hover:bg-base-200">
                <Search size={20} /> Ara
              </button>
              <button type="button" onClick={() => setTarayici(true)} className="btn btn-lg flex-1 rounded-2xl btn-outline text-primary-content border-white/60 hover:bg-white/15 hover:border-white">
                <Barcode size={20} /> Barkodla tara
              </button>
            </div>
          </form>

          <button onClick={konumIste} className="flex items-center gap-1.5 text-xs mt-3 opacity-90">
            <MapPin size={14} />
            {store.konumDurumu === 'tamam'
              ? `Konumun açık — ${store.yaricap} km çevrendeki fiyatlar`
              : store.konumDurumu === 'isteniyor'
              ? 'Konum alınıyor...'
              : 'Konumumu kullan (yakın fiyatlar için)'}
          </button>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs opacity-90">Bölge yarıçapı:</span>
            <div className="join">
              {YARICAP_SECENEKLERI.map((km) => (
                <button
                  key={km}
                  onClick={() => yaricapSec(km)}
                  className={`join-item btn btn-xs border-none ${
                    store.yaricap === km ? 'bg-base-100 text-primary' : 'bg-white/20 text-primary-content hover:bg-white/30'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
          </div>

          {/* Güven şeridi — "anlık fiyat" tıklanınca marketler canlı yenilenir */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={anlikYenile}
              disabled={yeniliyor}
              title="Marketleri ve fiyatları yenile"
              className="inline-flex items-center gap-1.5 bg-white/25 hover:bg-white/35 backdrop-blur rounded-full px-3 py-1 text-xs font-semibold transition active:scale-95"
            >
              {yeniliyor ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {yeniliyor ? 'yenileniyor…' : 'anlık fiyat'}
            </button>
            {[['🏪', '7 market'], ['📦', '50.000+ ürün'], ['🆓', 'ücretsiz']].map(([e, t]) => (
              <span key={t} className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full px-3 py-1 text-xs font-medium">
                <span>{e}</span> {t}
              </span>
            ))}
          </div>

          {/* Ana ekrana ekle + Nasıl kullanılır? — ortalı, belirgin */}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <UygulamayiYukle />
            <NasilKullanilir />
          </div>
        </div>
      </div>

      {/* Aramadayken: ana sayfaya dön düğmesi */}
      {aramaVar && (
        <button onClick={aramayiTemizle} className="btn btn-ghost btn-sm gap-1.5 self-start -mt-2 w-fit">
          <ArrowLeft size={16} /> Ana sayfaya dön
        </button>
      )}

      {/* Kategoriler (renkli kutular) + alt başlıklar + AI asistan + reklam */}
      {!aramaVar && (
        <>
          <AiAsistan yeniListe />
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <LayoutGrid size={18} className="text-primary" />
              <h2 className="font-bold">Kategoriler</h2>
              <span className="text-xs text-base-content/50">Bir kategori seç, alt başlıkları gör</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {KATEGORILER.map((k) => {
                const acik = acikKat === k.ad
                return (
                  <button
                    key={k.ad}
                    onClick={() => setAcikKat(acik ? null : k.ad)}
                    aria-expanded={acik}
                    style={{ backgroundImage: `linear-gradient(135deg, ${k.g1}, ${k.g2})`, textShadow: '0 1px 2px rgba(0,0,0,0.28)' }}
                    className={`relative rounded-3xl p-4 text-white text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition ${acik ? 'ring-2 ring-white ring-offset-2 ring-offset-base-100' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-2xl" style={{ textShadow: 'none' }}>{k.emoji}</div>
                      <ChevronDown size={18} className={`opacity-90 transition-transform ${acik ? 'rotate-180' : ''}`} />
                    </div>
                    <div className="font-bold text-sm mt-2 leading-tight">{k.ad}</div>
                  </button>
                )
              })}
            </div>

            {/* Açık kategorinin alt başlıkları — tıklayınca aranır */}
            {acikKat && (() => {
              const k = KATEGORILER.find((x) => x.ad === acikKat)
              if (!k) return null
              return (
                <div className={`rounded-2xl border-2 bg-base-100 p-3.5 ${AKSAN[k.renk]?.border || 'border-base-300'}`}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-lg">{k.emoji}</span>
                    <span className="font-semibold text-sm">{k.ad}</span>
                    <span className="text-xs text-base-content/40">— ne arıyorsun?</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {k.alt.map((a) => (
                      <button
                        key={a}
                        onClick={() => aramaYap(a)}
                        className={`px-3.5 py-2 rounded-full text-sm font-medium border transition active:scale-95 ${AKSAN[k.renk]?.cip || 'bg-base-200 border-base-300 hover:bg-base-300'}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}
          </section>
          {/* Reklam: Kategoriler altı */}
          <ReklamYuva konum="anasayfa-1" adsenseSlot={import.meta.env.VITE_ADSENSE_SLOT_LIST} />
        </>
      )}

      {/* Sana yakın marketler — seçilen yarıçapa göre anında süzülür */}
      {store.konumDurumu === 'tamam' && !aramaVar && (() => {
        const yakinlar = store.yakinMarketler.filter((m) => m.mesafe == null || m.mesafe <= store.yaricap * 1000)
        if (!yakinlar.length) return null
        return (
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              <h2 className="font-bold text-sm">Sana yakın marketler</h2>
              <span className="text-xs text-base-content/50">· {store.yaricap} km içinde {yakinlar.length}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 md:grid md:grid-cols-4 lg:grid-cols-6 md:overflow-visible">
              {yakinlar.slice(0, 12).map((m) => (
                <div key={m.id} className="shrink-0 bg-base-100 border border-base-300 rounded-2xl p-2.5 min-w-[130px] md:min-w-0">
                  <MarketBadge market={m.market} size="sm" />
                  <div className="text-xs mt-1 line-clamp-1">{m.sube}</div>
                  {m.mesafe != null && <div className="text-[11px] text-base-content/50">{formatMesafe(m.mesafe)}</div>}
                </div>
              ))}
            </div>
          </section>
        )
      })()}

      {/* Kapsanan marketler */}
      {!aramaVar && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-base-content/50">Karşılaştırılan marketler:</span>
          {KAPSANAN.map((m) => <MarketBadge key={m} market={m} size="sm" />)}
        </div>
      )}

      {/* Reklam: Marketler altı (En çok aranan üstü) */}
      {!aramaVar && <ReklamYuva konum="anasayfa-2" adsenseSlot={import.meta.env.VITE_ADSENSE_SLOT_LIST} />}

      {/* Konum kapalı uyarısı */}
      {store.konumDurumu !== 'tamam' && store.konumDurumu !== 'isteniyor' && (
        <div className="alert bg-warning/15 border border-warning/30 text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><MapPin size={16} className="text-warning" /> Konum kapalı — sonuçlar tüm Türkiye'den geliyor.</span>
          <button onClick={konumIste} className="btn btn-warning btn-xs">Konumu aç</button>
        </div>
      )}

      {yukleniyor && (
        <div className="flex justify-center py-10 text-base-content/50"><Loader2 className="animate-spin" /></div>
      )}
      {hata && <div className="alert alert-error text-sm">{hata}</div>}
      {bilgi && !yukleniyor && <div className="alert text-sm">{bilgi}</div>}

      {/* SONUÇLAR */}
      {!yukleniyor && sonuclar.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-semibold">{barkodUrunId ? 'Okuttuğun ürün ve benzerleri' : `"${aranan}" için sonuçlar`}</h2>
            <span className="text-xs text-base-content/50">
              {(toplam || sonuclar.length)} ürün bulundu
              {gosterilen.length !== sonuclar.length && ` · ${gosterilen.length} gösteriliyor`}
            </span>
          </div>

          {/* Tür çipleri — sonuçlardan çıkarılan alt türler (beyaz, kaşar, üçgen...) */}
          {turler.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
              <button
                onClick={() => turFiltre && turSec(turFiltre)}
                className={`px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap border transition ${!turFiltre ? 'bg-primary text-primary-content border-primary' : 'bg-base-100 text-base-content/70 border-base-300 hover:bg-base-200'}`}
              >
                Tümü
              </button>
              {turler.map((t) => (
                <button
                  key={t.w}
                  onClick={() => turSec(t.w)}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap border transition capitalize ${turFiltre === t.w ? 'bg-primary text-primary-content border-primary' : 'bg-base-100 text-base-content/70 border-base-300 hover:bg-base-200'}`}
                >
                  {t.w}
                </button>
              ))}
            </div>
          )}

          {/* Sıralama + market filtresi */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="flex items-center gap-1 text-base-content/50"><SlidersHorizontal size={14} /> Sırala:</span>
            <div className="join">
              <button onClick={() => setSiralama('ucuz')} className={`join-item btn btn-xs ${siralama === 'ucuz' ? 'btn-primary' : 'btn-ghost bg-base-100 border-base-300'}`}>En ucuz</button>
              <button onClick={() => setSiralama('fark')} className={`join-item btn btn-xs ${siralama === 'fark' ? 'btn-primary' : 'btn-ghost bg-base-100 border-base-300'}`}>En çok fark</button>
            </div>
            {kampanyaSayisi > 0 && (
              <button onClick={() => setSadeceKampanya((v) => !v)} className={`btn btn-xs gap-1 ${sadeceKampanya ? 'btn-secondary' : 'btn-ghost bg-base-100 border-base-300'}`}>
                🏷️ Kampanyalı ({kampanyaSayisi})
              </button>
            )}
            {urunMarkalari.length > 1 && (
              <select
                value={urunMarka || ''}
                onChange={(e) => setUrunMarka(e.target.value || null)}
                className={`select select-xs select-bordered bg-base-100 max-w-[9rem] ${urunMarka ? 'border-primary text-primary font-semibold' : ''}`}
              >
                <option value="">Tüm markalar</option>
                {urunMarkalari.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            {marketler.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => setMarketFiltre(null)} className={`btn btn-xs ${!marketFiltre ? 'btn-primary' : 'btn-ghost bg-base-100 border-base-300'}`}>Tümü</button>
                {marketler.map((m) => (
                  <button key={m} onClick={() => setMarketFiltre(m)} className={`rounded-md ${marketFiltre === m ? 'ring-2 ring-primary ring-offset-1' : ''}`}>
                    <MarketBadge market={m} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Izgara: görsel üstte dikey kartlar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {gosterilen.map((u) => (
              <ProductCard key={u.id} urun={u} onClick={() => onSelect(u)} />
            ))}
          </div>
          {/* Daha fazla göster (sayfalama) */}
          {sonuclar.length > 0 && toplam > sonuclar.length && (
            <button onClick={dahaGetir} disabled={dahaYuk} className="btn btn-outline btn-block rounded-xl gap-2">
              {dahaYuk ? <Loader2 size={18} className="animate-spin" /> : null}
              Daha fazla göster ({sonuclar.length} / {toplam})
            </button>
          )}

          <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_LIST} className="mt-1" />

          {gosterilen.length === 0 && (
            <div className="text-sm text-base-content/50 text-center py-6">Bu filtreye göre ürün yok. Market/marka filtresini kaldırmayı dene.</div>
          )}
        </div>
      )}

      {/* EN ÇOK ARANANLAR — gerçek arama verisinden dinamik */}
      {!aramaVar && populer.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-secondary" />
            <h2 className="font-bold">En çok aranan ürünler</h2>
          </div>
          <p className="text-xs text-base-content/50 -mt-1">Kullanıcıların en çok aradığı ürünler — dokun, en ucuz marketi anında gör.</p>
          <div className="flex flex-wrap gap-2">
            {populer.map((p, i) => (
              <button
                key={p.terim}
                onClick={() => aramaYap(p.terim)}
                className="group inline-flex items-center gap-2 bg-base-100 rounded-full border border-base-300 pl-2.5 pr-3.5 py-2 hover:border-primary/50 hover:shadow-sm active:scale-[0.97] transition"
              >
                <span className="grid place-items-center w-5 h-5 rounded-full bg-secondary/15 text-secondary text-[11px] font-bold shrink-0">{i + 1}</span>
                <span className="font-medium text-sm leading-none">{p.emoji ? `${p.emoji} ` : ''}{p.ad}</span>
                {p.sayi > 1 && <span className="text-[10px] text-base-content/40 leading-none">· {p.sayi}×</span>}
              </button>
            ))}
          </div>
          <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_LIST} className="mt-2" />
        </section>
      )}
    </div>
  )
}

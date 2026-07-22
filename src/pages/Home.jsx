import { useState, useMemo, useSyncExternalStore, useEffect, useRef, lazy, Suspense } from 'react'
import { Barcode, Search, MapPin, Loader2, Flame, TrendingDown, SlidersHorizontal, ArrowLeft } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import AdSlot from '../components/AdSlot'
import MarketBadge from '../components/MarketBadge'
import { POPULER } from '../data/populer'
import { marka } from '../lib/markets'
import { searchByKeyword, searchByBarcode, normalize } from '../lib/marketfiyati'
import { urunOnerileri } from '../lib/oneriler'
import { barkodCoz } from '../lib/barkod'
import { tl } from '../lib/format'
import { subscribe, getSnapshot, konumIste, yaricapDegistir, YARICAP_SECENEKLERI, aramaLogla } from '../lib/store'
import { izle } from '../lib/izleme'
import ReklamYuva from '../components/ReklamYuva'
import AiAsistan from '../components/AiAsistan'
import NasilKullanilir from '../components/NasilKullanilir'
import UygulamayiYukle from '../components/UygulamayiYukle'

const KATEGORILER = [
  { ad: 'Temel gıda', terim: 'pirinç', emoji: '🍚', grad: 'from-amber-400 to-orange-500' },
  { ad: 'Süt & Kahvaltı', terim: 'süt', emoji: '🥛', grad: 'from-sky-400 to-blue-500' },
  { ad: 'Temizlik', terim: 'deterjan', emoji: '🧴', grad: 'from-cyan-400 to-teal-500' },
  { ad: 'İçecek', terim: 'çay', emoji: '☕', grad: 'from-rose-400 to-pink-500' },
  { ad: 'Atıştırmalık', terim: 'bisküvi', emoji: '🍪', grad: 'from-violet-400 to-purple-500' },
  { ad: 'Bebek', terim: 'bebek bezi', emoji: '🍼', grad: 'from-emerald-400 to-green-500' },
]

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
  const [barkodUrunId, setBarkodUrunId] = useState(null) // barkodla taranan ürün (başta gösterilir)
  // Canlı arama önerileri
  const [oneriler, setOneriler] = useState([])
  const [oneriYaziyor, setOneriYaziyor] = useState(false) // kutuda yazılıyor → açılır liste göster
  const [oneriYukleniyor, setOneriYukleniyor] = useState(false)
  const zamanlayici = useRef(null)

  async function aramaYap(kelime) {
    const k = (kelime ?? q).trim()
    if (!k) return
    const konum = getSnapshot().konum
    setQ(k); setAktifKelime(k); setMarketFiltre(null); setUrunMarka(null); setSadeceKampanya(false); setBarkodUrunId(null)
    oneriKapat()
    setYukleniyor(true); setHata(null); setBilgi(''); setAranan(k)
    aramaLogla(k)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    try {
      const res = await searchByKeyword(k, konum)
      const list = normalize(res, konum)
      setSonuclar(list)
      if (!list.length) setBilgi(konum ? 'Bu bölgede sonuç bulunamadı. Yarıçapı büyütmeyi ya da farklı bir kelimeyi dene.' : 'Sonuç bulunamadı. Farklı bir kelime dene.')
    } catch {
      setHata('Arama başarısız oldu. Bağlantını kontrol et.')
    } finally {
      setYukleniyor(false)
    }
  }

  async function barkodOkundu(kod) {
    setTarayici(false)
    try { izle('barkod', { baslik: String(kod), detay: { kod: String(kod) } }) } catch { /* yok */ }
    const konum = getSnapshot().konum
    setYukleniyor(true); setHata(null); setBilgi(''); setQ(''); setAranan(`barkod: ${kod}`); setAktifKelime(''); setMarketFiltre(null); setUrunMarka(null); setSadeceKampanya(false)
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

  // Aramayı temizle → ana sayfa görünümüne dön.
  function aramayiTemizle() {
    setAranan(''); setAktifKelime(''); setQ(''); setSonuclar([])
    setHata(null); setBilgi(''); setMarketFiltre(null); setUrunMarka(null); setSadeceKampanya(false); setBarkodUrunId(null)
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

          {/* Güven şeridi */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[['🏪', '7 market'], ['📦', '50.000+ ürün'], ['⚡', 'anlık fiyat'], ['🆓', 'ücretsiz']].map(([e, t]) => (
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

      {/* Bento kategoriler + AI asistan + anasayfa reklam şeridi */}
      {!aramaVar && (
        <>
          <AiAsistan yeniListe />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {KATEGORILER.map((k) => (
              <button
                key={k.ad}
                onClick={() => aramaYap(k.terim)}
                className={`rounded-3xl p-4 bg-gradient-to-br ${k.grad} text-white text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition`}
              >
                <div className="text-2xl">{k.emoji}</div>
                <div className="font-bold text-sm mt-2 leading-tight">{k.ad}</div>
              </button>
            ))}
          </div>
          {/* Reklam: Kategoriler altı */}
          <ReklamYuva konum="anasayfa-1" adsenseSlot={import.meta.env.VITE_ADSENSE_SLOT_LIST} />
        </>
      )}

      {/* Sana yakın marketler */}
      {store.konumDurumu === 'tamam' && store.yakinMarketler.length > 0 && !aramaVar && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-primary" />
            <h2 className="font-bold text-sm">Sana yakın marketler</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 md:grid md:grid-cols-4 lg:grid-cols-6 md:overflow-visible">
            {store.yakinMarketler.slice(0, 12).map((m) => (
              <div key={m.id} className="shrink-0 bg-base-100 border border-base-300 rounded-2xl p-2.5 min-w-[130px] md:min-w-0">
                <MarketBadge market={m.market} size="sm" />
                <div className="text-xs mt-1 line-clamp-1">{m.sube}</div>
                {m.mesafe != null && <div className="text-[11px] text-base-content/50">{formatMesafe(m.mesafe)}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

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
            <span className="text-xs text-base-content/50">{gosterilen.length} / {sonuclar.length} ürün</span>
          </div>

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

          {/* Izgara: mobil tek sütun, masaüstü çok sütun */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {gosterilen.map((u) => (
              <ProductCard key={u.id} urun={u} onClick={() => onSelect(u)} />
            ))}
          </div>
          <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_LIST} className="mt-1" />

          {gosterilen.length === 0 && (
            <div className="text-sm text-base-content/50 text-center py-6">Bu filtreye göre ürün yok. Market/marka filtresini kaldırmayı dene.</div>
          )}
        </div>
      )}

      {/* EN ÇOK ARANANLAR */}
      {!aramaVar && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-secondary" />
            <h2 className="font-bold">En çok aranan ürünler</h2>
          </div>
          <p className="text-xs text-base-content/50 -mt-1">Dokun, o ürünün en ucuz olduğu marketi anında gör.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {POPULER.map((p) => (
              <button
                key={p.terim}
                onClick={() => aramaYap(p.terim)}
                className="bg-base-100 rounded-2xl border border-base-300 p-3 text-left hover:border-primary/50 hover:shadow-sm active:scale-[0.98] transition flex items-center gap-3"
              >
                <span className="text-2xl">{p.emoji}</span>
                <span className="min-w-0">
                  <span className="block font-medium leading-tight truncate">{p.ad}</span>
                  <span className="block text-[11px] text-base-content/50 truncate">{p.kat}</span>
                </span>
              </button>
            ))}
          </div>
          <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_LIST} className="mt-2" />
        </section>
      )}
    </div>
  )
}

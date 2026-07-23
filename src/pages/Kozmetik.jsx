import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, Sparkles, Check, X } from 'lucide-react'
import { tl } from '../lib/format'
import { kozmetikYukle, kozmetikKategoriler } from '../lib/kozmetik'
import { izle } from '../lib/izleme'

const BOYUT = 40

// Kategori adını okunur başlığa çevir (ilk harf büyük)
const baslikYap = (s) => (s ? s.charAt(0).toLocaleUpperCase('tr') + s.slice(1) : s)

function StokRozet({ stok }) {
  if (stok === 'var') return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5"><Check size={11} /> stokta</span>
  if (stok === 'yok') return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5"><X size={11} /> tükendi</span>
  return null
}

function Kart({ u }) {
  return (
    <div className="bg-base-100 rounded-2xl border border-base-300 hover:border-primary/40 hover:shadow-md overflow-hidden flex flex-col transition">
      <div className="relative aspect-square bg-white p-3">
        {u.gorsel ? (
          <img src={u.gorsel} alt="" loading="lazy" className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full grid place-items-center bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="flex flex-col items-center gap-1.5 opacity-80">
              <img src="/favicon.svg" alt="" className="w-11 h-11 rounded-xl shadow-sm" />
              <span className="text-xs font-extrabold tracking-tight leading-none"><span className="text-primary">nerede</span><span className="text-secondary">ucuz</span></span>
            </div>
          </div>
        )}
        <span className="absolute top-2 left-2 text-[10px] font-bold bg-fuchsia-600 text-white rounded-full px-2 py-0.5">{u.magaza}</span>
      </div>
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <div className="font-medium text-sm leading-tight line-clamp-2 min-h-[2.4em]">{u.ad}</div>
        {u.marka && <div className="text-[11px] text-base-content/40 -mt-0.5 truncate">{u.marka}</div>}
        <div className="mt-auto pt-1 space-y-1.5">
          <StokRozet stok={u.stok} />
          <div className="flex items-end justify-between gap-1">
            <div>
              <div className="text-[10px] text-base-content/40 leading-none">en ucuz</div>
              <div className="text-lg font-extrabold text-primary leading-tight">{tl(u.fiyat)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-base-content/40 leading-none">nerede</div>
              <div className="text-xs font-bold text-fuchsia-700 leading-tight">{u.magaza}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Kozmetik() {
  const [q, setQ] = useState('')
  const [aktifQ, setAktifQ] = useState('')
  const [kategori, setKategori] = useState(null)
  const [kategoriler, setKategoriler] = useState([])
  const [urunler, setUrunler] = useState([])
  const [toplam, setToplam] = useState(0)
  const [sayfa, setSayfa] = useState(0)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [dahaYuk, setDahaYuk] = useState(false)

  useEffect(() => { kozmetikKategoriler().then(setKategoriler) }, [])

  const getir = useCallback(async (opts) => {
    const { q: qq = aktifQ, kategori: kt = kategori, sayfa: sy = 0, ekle = false } = opts || {}
    if (ekle) setDahaYuk(true); else setYukleniyor(true)
    const { urunler: liste, toplam: tp } = await kozmetikYukle({ q: qq, kategori: kt, sayfa: sy, boyut: BOYUT })
    setUrunler((o) => (ekle ? [...o, ...liste] : liste))
    setToplam(tp); setSayfa(sy)
    setYukleniyor(false); setDahaYuk(false)
  }, [aktifQ, kategori])

  useEffect(() => { getir({ sayfa: 0 }) }, [aktifQ, kategori]) // eslint-disable-line react-hooks/exhaustive-deps

  function aramaGonder(e) {
    e?.preventDefault()
    setAktifQ(q.trim())
    try { if (q.trim()) izle('kozmetik_arama', { baslik: q.trim() }) } catch { /* yok */ }
  }
  function kategoriSec(k) { setKategori(k); setQ(''); setAktifQ('') }

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="rounded-3xl bg-gradient-to-br from-fuchsia-600 to-purple-700 text-white p-6 sm:p-8 shadow-lg">
        <div className="flex items-center gap-2 text-sm opacity-90 mb-2"><Sparkles size={18} /> güzellik & kişisel bakım</div>
        <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">Kozmetik ürünlerinde <span className="text-yellow-300">en iyi fiyat</span></h1>
        <p className="opacity-90 mt-2 text-sm">Gratis'teki makyaj, cilt ve saç bakım ürünlerinin güncel fiyat ve stok durumu. Beğendiğine dokun, mağazaya git.</p>
        <form onSubmit={aramaGonder} className="mt-4 flex gap-2">
          <label className="input flex items-center gap-2 w-full bg-base-100 text-base-content rounded-2xl">
            <Search size={18} className="text-base-content/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="maskara, ruj, şampuan..." className="grow" inputMode="search" />
            {q && <button type="button" onClick={() => { setQ(''); setAktifQ('') }} className="text-base-content/40 text-xl leading-none px-1">×</button>}
          </label>
          <button type="submit" className="btn rounded-2xl bg-base-100 text-fuchsia-700 border-none hover:bg-base-200"><Search size={18} /> Ara</button>
        </form>
      </div>

      {/* Kategori çipleri */}
      {kategoriler.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button onClick={() => kategoriSec(null)} className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition ${!kategori ? 'bg-fuchsia-600 text-white border-fuchsia-600' : 'bg-base-100 border-base-300 text-base-content/70 hover:bg-base-200'}`}>Tümü</button>
          {kategoriler.map((k) => (
            <button key={k.kategori} onClick={() => kategoriSec(k.kategori)} className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap capitalize transition ${kategori === k.kategori ? 'bg-fuchsia-600 text-white border-fuchsia-600' : 'bg-base-100 border-base-300 text-base-content/70 hover:bg-base-200'}`}>
              {baslikYap(k.kategori)} <span className="opacity-50">{k.adet}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sonuç sayısı */}
      {!yukleniyor && (
        <div className="text-xs text-base-content/50 px-1">{toplam} ürün{kategori ? ` · ${baslikYap(kategori)}` : ''}{aktifQ ? ` · "${aktifQ}"` : ''}</div>
      )}

      {/* Izgara */}
      {yukleniyor ? (
        <div className="flex justify-center py-16 text-base-content/40"><Loader2 className="animate-spin" /></div>
      ) : urunler.length === 0 ? (
        <div className="text-center text-sm text-base-content/50 py-16">Ürün bulunamadı. Farklı bir kelime ya da kategori dene.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {urunler.map((u) => <Kart key={u.id} u={u} />)}
          </div>
          {urunler.length < toplam && (
            <button onClick={() => getir({ sayfa: sayfa + 1, ekle: true })} disabled={dahaYuk} className="btn btn-outline btn-block rounded-xl gap-2">
              {dahaYuk ? <Loader2 size={18} className="animate-spin" /> : null}
              Daha fazla göster ({urunler.length} / {toplam})
            </button>
          )}
        </>
      )}

      <p className="text-[11px] text-base-content/40 text-center pt-2">Fiyat ve stok bilgisi Gratis'ten düzenli olarak güncellenir; anlık farklılık olabilir. Alışveriş mağazanın kendi sitesinde tamamlanır.</p>
    </div>
  )
}

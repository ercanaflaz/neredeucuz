import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, Loader2, Sparkles, Check, X, TrendingDown, ChevronDown } from 'lucide-react'
import { tl } from '../lib/format'
import { kozmetikTumGruplar, grupFiyat } from '../lib/kozmetik'
import { izle } from '../lib/izleme'

const SAYFA_ADET = 40
const baslikYap = (s) => (s || '')

// Mağaza rengi
const MAGAZA_RENK = { Gratis: '#E6007E', Rossmann: '#C8102E', Eve: '#0D9488' }
const magazaRenk = (m) => MAGAZA_RENK[m] || '#7c3aed'

// Kategori kutuları (ana sayfa tarzı: renkli kutu + alt başlıklar). ad = STANDART_KATEGORILER ile birebir.
// alt = ürün adında aranan alt-kelimeler (ikinci seviye filtre).
const KOZ_KAT = [
  { ad: 'Makyaj', emoji: '💄', g1: '#ec4899', g2: '#db2777', renk: 'pink', alt: ['Maskara', 'Ruj', 'Far', 'Fondöten', 'Kapatıcı', 'Allık', 'Pudra', 'Oje', 'Eyeliner', 'Kaş'] },
  { ad: 'Cilt Bakımı', emoji: '🧴', g1: '#0ea5e9', g2: '#2563eb', renk: 'sky', alt: ['Nemlendirici', 'Serum', 'Tonik', 'Güneş', 'Maske', 'Temizleme', 'Göz Kremi', 'Peeling'] },
  { ad: 'Saç Bakım', emoji: '💇', g1: '#8b5cf6', g2: '#7c3aed', renk: 'violet', alt: ['Şampuan', 'Saç Kremi', 'Saç Maskesi', 'Saç Boyası', 'Jöle', 'Sprey'] },
  { ad: 'Parfüm & Deodorant', emoji: '🌸', g1: '#f43f5e', g2: '#be123c', renk: 'rose', alt: ['Parfüm', 'Deodorant', 'Kolonya', 'Body Mist', 'Roll'] },
  { ad: 'Ağız & Diş', emoji: '🦷', g1: '#14b8a6', g2: '#0d9488', renk: 'teal', alt: ['Diş Macunu', 'Diş Fırçası', 'Gargara'] },
  { ad: 'Duş & Vücut', emoji: '🛁', g1: '#06b6d4', g2: '#0891b2', renk: 'cyan', alt: ['Duş Jeli', 'Sabun', 'Losyon', 'El Kremi'] },
  { ad: 'Tıraş', emoji: '🪒', g1: '#64748b', g2: '#475569', renk: 'slate', alt: ['Tıraş Köpüğü', 'Jilet', 'After Shave'] },
  { ad: 'Bebek & Mendil', emoji: '🍼', g1: '#10b981', g2: '#059669', renk: 'emerald', alt: ['Bebek Bezi', 'Islak Mendil', 'Bebek Şampuanı'] },
  { ad: 'Kağıt & Ped', emoji: '🧻', g1: '#f59e0b', g2: '#ea580c', renk: 'amber', alt: ['Tuvalet Kağıdı', 'Kağıt Havlu', 'Ped', 'Peçete'] },
]
const AKSAN = {
  pink: { border: 'border-pink-200', cip: 'bg-pink-50 border-pink-200 text-pink-800 hover:bg-pink-100', akt: 'bg-pink-600 text-white border-pink-600' },
  sky: { border: 'border-sky-200', cip: 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100', akt: 'bg-sky-600 text-white border-sky-600' },
  violet: { border: 'border-violet-200', cip: 'bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100', akt: 'bg-violet-600 text-white border-violet-600' },
  rose: { border: 'border-rose-200', cip: 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100', akt: 'bg-rose-600 text-white border-rose-600' },
  teal: { border: 'border-teal-200', cip: 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100', akt: 'bg-teal-600 text-white border-teal-600' },
  cyan: { border: 'border-cyan-200', cip: 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100', akt: 'bg-cyan-600 text-white border-cyan-600' },
  slate: { border: 'border-slate-300', cip: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100', akt: 'bg-slate-600 text-white border-slate-600' },
  emerald: { border: 'border-emerald-200', cip: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100', akt: 'bg-emerald-600 text-white border-emerald-600' },
  amber: { border: 'border-amber-200', cip: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100', akt: 'bg-amber-500 text-white border-amber-500' },
}

function StokRozet({ stok }) {
  if (stok === 'var') return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5"><Check size={11} /> stokta</span>
  if (stok === 'yok') return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5"><X size={11} /> tükendi</span>
  return null
}
function MagazaEtiket({ magaza }) {
  return <span className="text-xs font-bold" style={{ color: magazaRenk(magaza) }}>{magaza}</span>
}

function Kart({ g, kartMod, onClick }) {
  const karsilastirmali = g.magazaSayisi > 1
  const { sirali, enUcuz, tasarruf } = grupFiyat(g, kartMod)
  const kartVar = sirali.some((m) => m.kartIle)
  return (
    <div onClick={onClick} role="button" tabIndex={0}
      className="bg-base-100 rounded-2xl border border-base-300 hover:border-primary/40 hover:shadow-md overflow-hidden flex flex-col transition cursor-pointer active:scale-[0.98]">
      <div className="relative aspect-square bg-white p-3">
        {g.gorsel ? (
          <img src={g.gorsel} alt="" loading="lazy" className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full grid place-items-center bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="flex flex-col items-center gap-1.5 opacity-80">
              <img src="/favicon.svg" alt="" className="w-11 h-11 rounded-xl shadow-sm" />
              <span className="text-xs font-extrabold tracking-tight leading-none"><span className="text-primary">nerede</span><span className="text-secondary">ucuz</span></span>
            </div>
          </div>
        )}
        {karsilastirmali && <span className="absolute top-2 left-2 text-[10px] font-bold bg-primary text-primary-content rounded-full px-2 py-0.5">{g.magazaSayisi} mağaza</span>}
      </div>

      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <div className="font-medium text-sm leading-tight line-clamp-2 min-h-[2.4em]">{g.ad}</div>
        {g.marka && <div className="text-[11px] text-base-content/40 -mt-0.5 truncate">{g.marka}</div>}

        <div className="mt-auto pt-1 space-y-1.5">
          <StokRozet stok={enUcuz.stok} />
          {karsilastirmali ? (
            <>
              <div className="space-y-1">
                {sirali.map((m, i) => (
                  <div key={m.magaza} className={`flex items-center justify-between rounded-lg px-2 py-1 ${i === 0 ? 'bg-green-50 border border-green-200' : 'bg-base-200/60'}`}>
                    <span className="flex items-center gap-1">
                      <MagazaEtiket magaza={m.magaza} />
                      {m.kartIle && <span className="text-[9px] font-bold text-secondary bg-secondary/10 rounded px-1 leading-tight">kart</span>}
                    </span>
                    <span className={`text-sm font-bold ${i === 0 ? 'text-green-700' : 'text-base-content/50 line-through'}`}>{tl(m.etkin)}</span>
                  </div>
                ))}
              </div>
              {tasarruf > 0 && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-secondary">
                  <TrendingDown size={13} /> {tl(tasarruf)} daha ucuz — {enUcuz.magaza}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-end justify-between gap-1">
              <div>
                <div className="text-[10px] text-base-content/40 leading-none">{enUcuz.kartIle ? 'kart fiyatı' : 'fiyat'}</div>
                <div className="text-lg font-extrabold text-primary leading-tight">{tl(enUcuz.etkin)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-base-content/40 leading-none">nerede</div>
                <MagazaEtiket magaza={enUcuz.magaza} />
              </div>
            </div>
          )}
          <div className="text-[10px] text-base-content/40 leading-none">{kartVar ? '🏷️ kart fiyatı dahil' : '🏷️ herkese açık fiyat'}</div>
        </div>
      </div>
    </div>
  )
}

function Detay({ g, kartMod, onKapat }) {
  const { sirali, enUcuz, tasarruf } = grupFiyat(g, kartMod)
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={onKapat}>
      <div className="bg-base-100 rounded-2xl w-full max-w-md p-4 space-y-3 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div>
            {g.marka && <div className="text-xs text-base-content/50">{g.marka}</div>}
            <div className="font-bold leading-tight">{g.ad}</div>
          </div>
          <button onClick={onKapat} className="btn btn-ghost btn-sm btn-circle shrink-0"><X size={18} /></button>
        </div>
        <div className="aspect-square bg-white rounded-xl border border-base-200 p-4 grid place-items-center">
          {g.gorsel ? <img src={g.gorsel} alt="" className="w-full h-full object-contain" />
            : <div className="flex flex-col items-center gap-1.5 opacity-70"><img src="/favicon.svg" alt="" className="w-12 h-12 rounded-xl" /><span className="text-xs font-extrabold"><span className="text-primary">nerede</span><span className="text-secondary">ucuz</span></span></div>}
        </div>
        <div>
          <div className="text-xs font-semibold text-base-content/60 mb-1.5">Fiyat karşılaştırması</div>
          <div className="space-y-1.5">
            {sirali.map((m, i) => (
              <div key={m.magaza} className={`flex items-center justify-between rounded-xl px-3 py-2 ${i === 0 ? 'bg-green-50 border-2 border-green-300' : 'bg-base-200/60 border border-base-300'}`}>
                <span className="flex items-center gap-2 flex-wrap">
                  <MagazaEtiket magaza={m.magaza} />
                  {i === 0 && <span className="text-[10px] font-bold bg-green-600 text-white rounded-full px-2 py-0.5">EN UCUZ</span>}
                  {m.kartIle && <span className="text-[10px] font-bold text-secondary bg-secondary/10 rounded-full px-2 py-0.5">kart ile</span>}
                  <StokRozet stok={m.stok} />
                </span>
                <span className="text-right leading-tight">
                  <span className={`font-extrabold ${i === 0 ? 'text-green-700 text-lg' : 'text-base-content/50 line-through'}`}>{tl(m.etkin)}</span>
                  {m.kartIle && <span className="block text-[10px] text-base-content/40 font-normal no-underline">herkese açık {tl(m.fiyat)}</span>}
                </span>
              </div>
            ))}
          </div>
          {tasarruf > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-secondary">
              <TrendingDown size={16} /> {enUcuz.magaza}'da <b>{tl(tasarruf)}</b> daha ucuz
            </div>
          )}
          {g.magazaSayisi === 1 && <div className="mt-2 text-xs text-base-content/50">Şimdilik sadece {enUcuz.magaza}'da bulundu.</div>}
        </div>
        <div className="text-[11px] text-base-content/40 pt-1 border-t border-base-200">{kartMod ? 'Mümkünse mağaza kartı (Eve/Gratis/Rossmann Kart) fiyatı gösterilir; kart fiyatı yoksa herkese açık fiyat kullanılır.' : 'Herkese açık (kartsız) fiyatlar gösterilir; mağaza kartıyla daha ucuz olabilir.'} Anlık farklılık olabilir.</div>
      </div>
    </div>
  )
}

// Yüklenirken gösterilen iskelet (skeleton) kart — gerçek kart düzenini taklit eder.
function IskeletKart() {
  return (
    <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden flex flex-col">
      <div className="aspect-square bg-base-200 animate-pulse" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 w-full bg-base-200 rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-base-200 rounded animate-pulse" />
        <div className="h-7 w-full bg-base-200 rounded-lg animate-pulse mt-2" />
      </div>
    </div>
  )
}

export default function Kozmetik() {
  const [tumGruplar, setTumGruplar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [q, setQ] = useState('')
  const [aktifQ, setAktifQ] = useState('')
  const [kategori, setKategori] = useState(null)
  const [altKelime, setAltKelime] = useState(null) // alt başlık (ürün adında aranan kelime)
  const [acikKat, setAcikKat] = useState(null)      // açık kutu (alt başlıklar görünsün)
  const [sadeceKarsi, setSadeceKarsi] = useState(false)
  const [kartMod, setKartMod] = useState(true) // true = kart fiyatına göre (varsayılan)
  const [gosterilen, setGosterilen] = useState(SAYFA_ADET)
  const [secili, setSecili] = useState(null)
  const altPanelRef = useRef(null)

  useEffect(() => {
    let iptal = false
    kozmetikTumGruplar().then((liste) => { if (!iptal) { setTumGruplar(liste); setYukleniyor(false) } })
    return () => { iptal = true }
  }, [])

  const karsiSayisi = useMemo(() => tumGruplar.filter((g) => g.magazaSayisi > 1).length, [tumGruplar])

  const katSay = useMemo(() => { const m = new Map(); tumGruplar.forEach((g) => m.set(g.kategori, (m.get(g.kategori) || 0) + 1)); return m }, [tumGruplar])

  const suzulmus = useMemo(() => {
    let liste = tumGruplar
    if (kategori) liste = liste.filter((g) => g.kategori === kategori)
    if (altKelime) { const a = altKelime.toLocaleLowerCase('tr'); liste = liste.filter((g) => (`${g.marka} ${g.ad}`).toLocaleLowerCase('tr').includes(a)) }
    if (sadeceKarsi) liste = liste.filter((g) => g.magazaSayisi > 1)
    if (aktifQ) { const q2 = aktifQ.toLocaleLowerCase('tr'); liste = liste.filter((g) => (`${g.marka} ${g.ad}`).toLocaleLowerCase('tr').includes(q2)) }
    return liste
  }, [tumGruplar, kategori, altKelime, sadeceKarsi, aktifQ])

  useEffect(() => { setGosterilen(SAYFA_ADET) }, [kategori, altKelime, sadeceKarsi, aktifQ])

  // Kategori kutusu açılınca alt panel + sonuçlar görünür olsun (özellikle mobilde
  // kutular ekranı doldurduğu için sayfanın açıldığı fark edilmiyordu).
  useEffect(() => {
    if (!acikKat) return
    const t = setTimeout(() => { altPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 60)
    return () => clearTimeout(t)
  }, [acikKat])

  function kutuSec(k) {
    if (kategori === k.ad) { setKategori(null); setAcikKat(null); setAltKelime(null) }
    else { setKategori(k.ad); setAcikKat(k.ad); setAltKelime(null) }
  }

  function aramaGonder(e) {
    e?.preventDefault()
    setAktifQ(q.trim())
    try { if (q.trim()) izle('kozmetik_arama', { baslik: q.trim() }) } catch { /* yok */ }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-fuchsia-600 to-purple-700 text-white p-6 sm:p-8 shadow-lg">
        <div className="flex items-center gap-2 text-sm opacity-90 mb-2"><Sparkles size={18} /> güzellik & kişisel bakım</div>
        <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">Kozmetikte <span className="text-yellow-300">en ucuz nerede</span></h1>
        <p className="opacity-90 mt-2 text-sm">Gratis, Eve ve Rossmann fiyatlarını karşılaştır; aynı ürün hangi mağazada daha ucuz anında gör.</p>
        <form onSubmit={aramaGonder} className="mt-4 flex gap-2">
          <label className="input flex items-center gap-2 w-full bg-base-100 text-base-content rounded-2xl">
            <Search size={18} className="text-base-content/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="maskara, ruj, şampuan..." className="grow" inputMode="search" />
            {q && <button type="button" onClick={() => { setQ(''); setAktifQ('') }} className="text-base-content/40 text-xl leading-none px-1">×</button>}
          </label>
          <button type="submit" className="btn rounded-2xl bg-base-100 text-fuchsia-700 border-none hover:bg-base-200"><Search size={18} /> Ara</button>
        </form>
      </div>

      {/* Kategori kutuları (renkli) + alt başlıklar */}
      {!yukleniyor && (
        <section className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {KOZ_KAT.filter((k) => katSay.get(k.ad)).map((k) => {
              const acik = acikKat === k.ad
              return (
                <button key={k.ad} onClick={() => kutuSec(k)} aria-expanded={acik}
                  style={{ backgroundImage: `linear-gradient(135deg, ${k.g1}, ${k.g2})`, textShadow: '0 1px 2px rgba(0,0,0,0.28)' }}
                  className={`relative rounded-3xl p-4 text-white text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition ${kategori === k.ad ? 'ring-2 ring-white ring-offset-2 ring-offset-base-100' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="text-2xl" style={{ textShadow: 'none' }}>{k.emoji}</div>
                    <ChevronDown size={18} className={`opacity-90 transition-transform ${acik ? 'rotate-180' : ''}`} />
                  </div>
                  <div className="font-bold text-sm mt-2 leading-tight">{k.ad}</div>
                  <div className="text-[11px] opacity-80">{katSay.get(k.ad)} ürün</div>
                </button>
              )
            })}
          </div>

          {/* Açık kategorinin alt başlıkları */}
          {acikKat && (() => {
            const k = KOZ_KAT.find((x) => x.ad === acikKat)
            if (!k) return null
            const ak = AKSAN[k.renk] || {}
            return (
              <div ref={altPanelRef} className={`scroll-mt-24 rounded-2xl border-2 bg-base-100 p-3.5 ${ak.border || 'border-base-300'}`}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-lg">{k.emoji}</span>
                  <span className="font-semibold text-sm">{k.ad}</span>
                  <span className="text-xs text-base-content/40">— alt başlık seç</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setAltKelime(null)} className={`px-3.5 py-2 rounded-full text-sm font-semibold border transition active:scale-95 ${!altKelime ? (ak.akt || 'bg-primary text-primary-content border-primary') : 'bg-base-100 border-base-300 text-base-content/70 hover:bg-base-200'}`}>Tümü</button>
                  {k.alt.map((a) => (
                    <button key={a} onClick={() => setAltKelime(altKelime === a ? null : a)}
                      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition active:scale-95 ${altKelime === a ? (ak.akt || 'bg-primary text-primary-content border-primary') : (ak.cip || 'bg-base-200 border-base-300 hover:bg-base-300')}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}
        </section>
      )}

      {!yukleniyor && (
        <div className="flex items-center justify-between gap-2 flex-wrap px-1">
          <div className="text-xs text-base-content/50">{suzulmus.length} ürün{kategori ? ` · ${kategori}` : ''}{altKelime ? ` · ${altKelime}` : ''}{aktifQ ? ` · "${aktifQ}"` : ''}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setKartMod((v) => !v)} className={`btn btn-xs gap-1 ${kartMod ? 'btn-secondary' : 'btn-ghost bg-base-100 border-base-300'}`} title="Mağaza kartı fiyatlarını göster/gizle">
              🏷️ {kartMod ? 'Kart fiyatıyla' : 'Kartsız fiyat'}
            </button>
            {karsiSayisi > 0 && (
              <button onClick={() => setSadeceKarsi((v) => !v)} className={`btn btn-xs gap-1 ${sadeceKarsi ? 'btn-primary' : 'btn-ghost bg-base-100 border-base-300'}`}>
                ⚖️ Sadece karşılaştırmalı ({karsiSayisi})
              </button>
            )}
          </div>
        </div>
      )}

      {yukleniyor ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm text-base-content/60 py-2">
            <Loader2 className="animate-spin text-primary" size={18} /> Ürünler yükleniyor, lütfen bekleyin…
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {Array.from({ length: 8 }).map((_, i) => <IskeletKart key={i} />)}
          </div>
        </div>
      ) : suzulmus.length === 0 ? (
        <div className="text-center text-sm text-base-content/50 py-16">Ürün bulunamadı. Farklı bir kelime ya da kategori dene.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {suzulmus.slice(0, gosterilen).map((g) => (
              <Kart key={g.anahtar} g={g} kartMod={kartMod} onClick={() => { setSecili(g); try { izle('kozmetik_urun', { baslik: g.ad }) } catch { /* yok */ } }} />
            ))}
          </div>
          {gosterilen < suzulmus.length && (
            <button onClick={() => setGosterilen((n) => n + SAYFA_ADET)} className="btn btn-outline btn-block rounded-xl">
              Daha fazla göster ({gosterilen} / {suzulmus.length})
            </button>
          )}
        </>
      )}

      <p className="text-[11px] text-base-content/40 text-center pt-2">Fiyatlar Gratis, Eve ve Rossmann'dan düzenli güncellenir. {kartMod ? 'Mümkünse mağaza kartı fiyatı gösterilir.' : 'Kartsız/herkese açık fiyatlar gösterilir.'} Anlık farklılık olabilir.</p>

      {secili && <Detay g={secili} kartMod={kartMod} onKapat={() => setSecili(null)} />}
    </div>
  )
}

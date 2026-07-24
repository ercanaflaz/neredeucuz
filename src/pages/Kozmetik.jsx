import { useState, useEffect, useMemo } from 'react'
import { Search, Loader2, Sparkles, Check, X, TrendingDown } from 'lucide-react'
import { tl } from '../lib/format'
import { kozmetikTumGruplar, STANDART_KATEGORILER } from '../lib/kozmetik'
import { izle } from '../lib/izleme'

const SAYFA_ADET = 40
const baslikYap = (s) => (s || '')

// Mağaza rengi
const MAGAZA_RENK = { Gratis: '#E6007E', Rossmann: '#C8102E', Eve: '#0D9488' }
const magazaRenk = (m) => MAGAZA_RENK[m] || '#7c3aed'
// Kart indirimi olan (üyelik) mağazalar — fiyatları "kartsız" olarak gösteriyoruz
const KART_MAGAZA = new Set(['Gratis', 'Rossmann'])

// Kategori çipi renk paleti (Tailwind purge için tam sınıf adları)
const CIP_RENK = [
  { pas: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100', akt: 'bg-pink-600 text-white border-pink-600' },
  { pas: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100', akt: 'bg-violet-600 text-white border-violet-600' },
  { pas: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100', akt: 'bg-sky-600 text-white border-sky-600' },
  { pas: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100', akt: 'bg-emerald-600 text-white border-emerald-600' },
  { pas: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100', akt: 'bg-amber-500 text-white border-amber-500' },
  { pas: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100', akt: 'bg-rose-600 text-white border-rose-600' },
  { pas: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100', akt: 'bg-teal-600 text-white border-teal-600' },
  { pas: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100', akt: 'bg-orange-600 text-white border-orange-600' },
  { pas: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100', akt: 'bg-cyan-600 text-white border-cyan-600' },
]

function StokRozet({ stok }) {
  if (stok === 'var') return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5"><Check size={11} /> stokta</span>
  if (stok === 'yok') return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5"><X size={11} /> tükendi</span>
  return null
}
function MagazaEtiket({ magaza }) {
  return <span className="text-xs font-bold" style={{ color: magazaRenk(magaza) }}>{magaza}</span>
}

function Kart({ g, onClick }) {
  const karsilastirmali = g.magazaSayisi > 1
  const kartVar = g.magazalar.some((m) => KART_MAGAZA.has(m.magaza))
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
          <StokRozet stok={g.enUcuz.stok} />
          {karsilastirmali ? (
            <>
              <div className="space-y-1">
                {g.magazalar.map((m, i) => (
                  <div key={m.magaza} className={`flex items-center justify-between rounded-lg px-2 py-1 ${i === 0 ? 'bg-green-50 border border-green-200' : 'bg-base-200/60'}`}>
                    <MagazaEtiket magaza={m.magaza} />
                    <span className={`text-sm font-bold ${i === 0 ? 'text-green-700' : 'text-base-content/50 line-through'}`}>{tl(m.fiyat)}</span>
                  </div>
                ))}
              </div>
              {g.tasarruf > 0 && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-secondary">
                  <TrendingDown size={13} /> {tl(g.tasarruf)} daha ucuz — {g.enUcuz.magaza}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-end justify-between gap-1">
              <div>
                <div className="text-[10px] text-base-content/40 leading-none">fiyat</div>
                <div className="text-lg font-extrabold text-primary leading-tight">{tl(g.enUcuz.fiyat)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-base-content/40 leading-none">nerede</div>
                <MagazaEtiket magaza={g.enUcuz.magaza} />
              </div>
            </div>
          )}
          {kartVar && <div className="text-[10px] text-base-content/40 leading-none">🏷️ kartsız fiyat</div>}
        </div>
      </div>
    </div>
  )
}

function Detay({ g, onKapat }) {
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
            {g.magazalar.map((m, i) => (
              <div key={m.magaza} className={`flex items-center justify-between rounded-xl px-3 py-2 ${i === 0 ? 'bg-green-50 border-2 border-green-300' : 'bg-base-200/60 border border-base-300'}`}>
                <span className="flex items-center gap-2 flex-wrap">
                  <MagazaEtiket magaza={m.magaza} />
                  {i === 0 && <span className="text-[10px] font-bold bg-green-600 text-white rounded-full px-2 py-0.5">EN UCUZ</span>}
                  {KART_MAGAZA.has(m.magaza) && <span className="text-[10px] text-base-content/40">kartsız</span>}
                  <StokRozet stok={m.stok} />
                </span>
                <span className={`font-extrabold ${i === 0 ? 'text-green-700 text-lg' : 'text-base-content/50 line-through'}`}>{tl(m.fiyat)}</span>
              </div>
            ))}
          </div>
          {g.tasarruf > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-secondary">
              <TrendingDown size={16} /> {g.enUcuz.magaza}'da <b>{tl(g.tasarruf)}</b> daha ucuz
            </div>
          )}
          {g.magazaSayisi === 1 && <div className="mt-2 text-xs text-base-content/50">Şimdilik sadece {g.enUcuz.magaza}'da bulundu.</div>}
        </div>
        <div className="text-[11px] text-base-content/40 pt-1 border-t border-base-200">Gösterilen fiyatlar kartsız/herkese açık fiyatlardır; Gratis ve Rossmann kartıyla daha ucuz olabilir. Anlık farklılık olabilir.</div>
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
  const [sadeceKarsi, setSadeceKarsi] = useState(false)
  const [gosterilen, setGosterilen] = useState(SAYFA_ADET)
  const [secili, setSecili] = useState(null)

  useEffect(() => {
    let iptal = false
    kozmetikTumGruplar().then((liste) => { if (!iptal) { setTumGruplar(liste); setYukleniyor(false) } })
    return () => { iptal = true }
  }, [])

  // Kategori sayıları (temiz kategorilerden)
  const kategoriler = useMemo(() => {
    const say = new Map()
    tumGruplar.forEach((g) => say.set(g.kategori, (say.get(g.kategori) || 0) + 1))
    return STANDART_KATEGORILER.filter((k) => say.get(k)).map((k) => ({ kategori: k, adet: say.get(k) }))
  }, [tumGruplar])

  const karsiSayisi = useMemo(() => tumGruplar.filter((g) => g.magazaSayisi > 1).length, [tumGruplar])

  const suzulmus = useMemo(() => {
    let liste = tumGruplar
    if (kategori) liste = liste.filter((g) => g.kategori === kategori)
    if (sadeceKarsi) liste = liste.filter((g) => g.magazaSayisi > 1)
    if (aktifQ) { const q2 = aktifQ.toLocaleLowerCase('tr'); liste = liste.filter((g) => (`${g.marka} ${g.ad}`).toLocaleLowerCase('tr').includes(q2)) }
    return liste
  }, [tumGruplar, kategori, sadeceKarsi, aktifQ])

  useEffect(() => { setGosterilen(SAYFA_ADET) }, [kategori, sadeceKarsi, aktifQ])

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

      {kategoriler.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setKategori(null)} className={`px-3.5 py-2 rounded-full text-sm font-semibold border transition active:scale-95 ${!kategori ? 'bg-fuchsia-600 text-white border-fuchsia-600' : 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100'}`}>Tümü</button>
          {kategoriler.map((k, i) => {
            const renk = CIP_RENK[i % CIP_RENK.length]
            const aktif = kategori === k.kategori
            return (
              <button key={k.kategori} onClick={() => setKategori(k.kategori)} className={`px-3.5 py-2 rounded-full text-sm font-medium border transition active:scale-95 ${aktif ? renk.akt : renk.pas}`}>
                {baslikYap(k.kategori)} <span className="opacity-60 font-normal">{k.adet}</span>
              </button>
            )
          })}
        </div>
      )}

      {!yukleniyor && (
        <div className="flex items-center justify-between gap-2 flex-wrap px-1">
          <div className="text-xs text-base-content/50">{suzulmus.length} ürün{kategori ? ` · ${kategori}` : ''}{aktifQ ? ` · "${aktifQ}"` : ''}</div>
          {karsiSayisi > 0 && (
            <button onClick={() => setSadeceKarsi((v) => !v)} className={`btn btn-xs gap-1 ${sadeceKarsi ? 'btn-primary' : 'btn-ghost bg-base-100 border-base-300'}`}>
              ⚖️ Sadece karşılaştırmalı ({karsiSayisi})
            </button>
          )}
        </div>
      )}

      {yukleniyor ? (
        <div className="flex justify-center py-16 text-base-content/40"><Loader2 className="animate-spin" /></div>
      ) : suzulmus.length === 0 ? (
        <div className="text-center text-sm text-base-content/50 py-16">Ürün bulunamadı. Farklı bir kelime ya da kategori dene.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {suzulmus.slice(0, gosterilen).map((g) => (
              <Kart key={g.anahtar} g={g} onClick={() => { setSecili(g); try { izle('kozmetik_urun', { baslik: g.ad }) } catch { /* yok */ } }} />
            ))}
          </div>
          {gosterilen < suzulmus.length && (
            <button onClick={() => setGosterilen((n) => n + SAYFA_ADET)} className="btn btn-outline btn-block rounded-xl">
              Daha fazla göster ({gosterilen} / {suzulmus.length})
            </button>
          )}
        </>
      )}

      <p className="text-[11px] text-base-content/40 text-center pt-2">Fiyatlar Gratis, Eve ve Rossmann'dan düzenli güncellenir; <b>kartsız/herkese açık fiyatlardır</b> (kart ile daha ucuz olabilir). Anlık farklılık olabilir.</p>

      {secili && <Detay g={secili} onKapat={() => setSecili(null)} />}
    </div>
  )
}

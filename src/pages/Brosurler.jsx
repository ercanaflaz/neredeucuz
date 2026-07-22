import { useEffect, useMemo, useState } from 'react'
import { useSyncExternalStore } from 'react'
import { Newspaper, Calendar, ExternalLink, Loader2, Store } from 'lucide-react'
import { subscribeBrosur, getBrosur, brosurleriYukle, aktifBrosurler, marketRenk } from '../lib/brosur'

function tarihAralik(bas, bit) {
  const f = (d) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
  if (bas && bit) return `${f(bas)} – ${f(bit)}`
  if (bit) return `${f(bit)} tarihine kadar`
  if (bas) return `${f(bas)}'den itibaren`
  return null
}

function MarketRozet({ market, buyuk }) {
  return (
    <span
      className={`inline-flex items-center font-bold text-white rounded-lg ${buyuk ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-[11px]'}`}
      style={{ backgroundColor: marketRenk(market) }}
    >
      {market}
    </span>
  )
}

export default function Brosurler() {
  const { brosurler, yuklendi } = useSyncExternalStore(subscribeBrosur, getBrosur)
  const [market, setMarket] = useState('hepsi')

  useEffect(() => { brosurleriYukle() }, [])

  const liste = aktifBrosurler()
  const marketler = useMemo(() => {
    const set = []
    for (const b of liste) if (!set.includes(b.market)) set.push(b.market)
    return set
  }, [liste])

  const gosterilen = market === 'hepsi' ? liste : liste.filter((b) => b.market === market)

  return (
    <div className="space-y-4">
      {/* Başlık */}
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary grid place-items-center"><Newspaper size={19} /></div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Aktüel Broşürler</h1>
          <p className="text-[12px] text-base-content/50">Marketlerin bu haftaki indirim katalogları tek yerde.</p>
        </div>
      </div>

      {/* Market filtresi */}
      {marketler.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <button onClick={() => setMarket('hepsi')}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap border transition ${market === 'hepsi' ? 'bg-primary text-primary-content border-primary' : 'bg-base-100 text-base-content/70 border-base-300 hover:bg-base-200'}`}>
            Tümü
          </button>
          {marketler.map((m) => (
            <button key={m} onClick={() => setMarket(m)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap border transition ${market === m ? 'text-white border-transparent' : 'bg-base-100 text-base-content/70 border-base-300 hover:bg-base-200'}`}
              style={market === m ? { backgroundColor: marketRenk(m) } : undefined}>
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Liste */}
      {!yuklendi ? (
        <div className="flex justify-center py-14 text-base-content/40"><Loader2 className="animate-spin" /></div>
      ) : gosterilen.length === 0 ? (
        <div className="text-center py-14 text-base-content/50">
          <Newspaper size={42} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Şu an aktif broşür yok</p>
          <p className="text-sm mt-1">Yeni kataloglar eklendiğinde burada göreceksin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {gosterilen.map((b) => {
            const ic = (
              <div className="group rounded-2xl border border-base-300 bg-base-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition h-full flex flex-col">
                <div className="relative aspect-[3/4] bg-base-200 overflow-hidden">
                  {b.gorsel ? (
                    <img src={b.gorsel} alt={b.baslik} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition" />
                  ) : (
                    <div className="w-full h-full grid place-items-center" style={{ backgroundColor: marketRenk(b.market) + '15' }}>
                      <Store size={32} style={{ color: marketRenk(b.market) }} />
                    </div>
                  )}
                  <div className="absolute top-2 left-2"><MarketRozet market={b.market} /></div>
                  {b.link && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition">
                      <ExternalLink size={14} />
                    </div>
                  )}
                </div>
                <div className="p-2.5 flex-1 flex flex-col">
                  <div className="font-semibold text-sm leading-tight line-clamp-2">{b.baslik}</div>
                  {tarihAralik(b.tarih_bas, b.tarih_bit) && (
                    <div className="text-[11px] text-base-content/50 mt-1 flex items-center gap-1">
                      <Calendar size={12} /> {tarihAralik(b.tarih_bas, b.tarih_bit)}
                    </div>
                  )}
                </div>
              </div>
            )
            return b.link
              ? <a key={b.id} href={b.link} target="_blank" rel="noopener noreferrer">{ic}</a>
              : <div key={b.id}>{ic}</div>
          })}
        </div>
      )}

      <p className="text-[11px] text-base-content/40 text-center">
        Broşürler ilgili marketlerin resmi kaynaklarına aittir; "Broşürü gör" ile market sayfasına yönlendirilirsin.
      </p>
    </div>
  )
}

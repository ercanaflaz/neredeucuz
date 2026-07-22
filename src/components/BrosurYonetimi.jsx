import { useState, useEffect, useSyncExternalStore } from 'react'
import { Newspaper, Plus, Trash2, Eye, EyeOff, ExternalLink } from 'lucide-react'
import {
  subscribeBrosur, getBrosur, brosurleriYukle, brosurEkle, brosurSil, brosurAktifDegistir,
  MARKET_ADLARI, marketRenk,
} from '../lib/brosur'

const bos = { market: 'BİM', baslik: '', kategori: 'Süpermarket', gorsel: '', link: '', tarih_bas: '', tarih_bit: '', sira: 0 }

export default function BrosurYonetimi() {
  const { brosurler } = useSyncExternalStore(subscribeBrosur, getBrosur)
  const [f, setF] = useState(bos)
  const [bekle, setBekle] = useState(false)
  const [hata, setHata] = useState('')

  useEffect(() => { brosurleriYukle() }, [])

  async function ekle(e) {
    e.preventDefault()
    if (!f.baslik.trim()) { setHata('Başlık gerekli'); return }
    setBekle(true); setHata('')
    try { await brosurEkle(f); setF({ ...bos, market: f.market }) }
    catch (err) { setHata(err.message || 'Eklenemedi') }
    finally { setBekle(false) }
  }

  return (
    <section className="bg-base-100 border border-base-300 rounded-3xl p-4 space-y-4">
      <h2 className="text-sm font-semibold text-base-content/70 flex items-center gap-1.5"><Newspaper size={16} /> Broşür Yönetimi</h2>

      <form onSubmit={ekle} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select value={f.market} onChange={(e) => setF({ ...f, market: e.target.value })} className="select select-bordered select-sm">
          {MARKET_ADLARI.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={f.kategori} onChange={(e) => setF({ ...f, kategori: e.target.value })} placeholder="Kategori (ör. Süpermarket)" className="input input-bordered input-sm" />
        <input value={f.baslik} onChange={(e) => setF({ ...f, baslik: e.target.value })} placeholder="Başlık (ör. Bu hafta aktüel)" className="input input-bordered input-sm sm:col-span-2" />
        <input value={f.gorsel} onChange={(e) => setF({ ...f, gorsel: e.target.value })} placeholder="Kapak görseli URL (opsiyonel)" className="input input-bordered input-sm sm:col-span-2" />
        <input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="Broşür bağlantısı (resmi market sayfası)" className="input input-bordered input-sm sm:col-span-2" />
        <label className="text-[11px] text-base-content/50 flex flex-col gap-0.5">Başlangıç
          <input type="date" value={f.tarih_bas} onChange={(e) => setF({ ...f, tarih_bas: e.target.value })} className="input input-bordered input-sm" />
        </label>
        <label className="text-[11px] text-base-content/50 flex flex-col gap-0.5">Bitiş
          <input type="date" value={f.tarih_bit} onChange={(e) => setF({ ...f, tarih_bit: e.target.value })} className="input input-bordered input-sm" />
        </label>
        <button type="submit" disabled={bekle} className="btn btn-primary btn-sm sm:col-span-2"><Plus size={16} /> Broşür ekle</button>
      </form>
      {hata && <div className="alert alert-error text-xs py-2">{hata}</div>}

      {/* Liste */}
      <div className="space-y-2">
        {brosurler.length === 0 && <div className="text-xs text-base-content/40 text-center py-3">Henüz broşür yok.</div>}
        {brosurler.map((b) => (
          <div key={b.id} className="flex items-center gap-3 border border-base-200 rounded-xl p-2">
            <div className="w-12 h-14 rounded-lg bg-base-200 overflow-hidden shrink-0 grid place-items-center">
              {b.gorsel ? <img src={b.gorsel} alt="" className="w-full h-full object-cover" /> : <Newspaper size={16} className="text-base-content/30" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-white rounded px-1.5 py-0.5" style={{ backgroundColor: marketRenk(b.market) }}>{b.market}</span>
                <span className="text-sm font-medium truncate">{b.baslik}</span>
              </div>
              <div className="text-[11px] text-base-content/50 truncate flex items-center gap-1">
                {b.kategori && <span>{b.kategori}</span>}
                {b.link && <a href={b.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 link"><ExternalLink size={11} /> bağlantı</a>}
                {b.tarih_bit && <span>· {new Date(b.tarih_bit).toLocaleDateString('tr-TR')} son</span>}
              </div>
            </div>
            <button onClick={() => brosurAktifDegistir(b.id, !b.aktif)} className={`btn btn-xs btn-circle ${b.aktif ? 'btn-success' : 'btn-ghost'}`} title={b.aktif ? 'Aktif — kapat' : 'Pasif — aç'}>
              {b.aktif ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button onClick={() => brosurSil(b.id)} className="btn btn-xs btn-circle btn-ghost text-base-content/40"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-base-content/40">
        Not: Broşür görsellerini birebir kopyalamak yerine, marketin <b>resmi broşür bağlantısını</b> girmen telif açısından en güvenlisidir.
      </p>
    </section>
  )
}

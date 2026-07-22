import { useState, useSyncExternalStore } from 'react'
import { Megaphone, Plus, Trash2, Eye, EyeOff, MapPin, MousePointerClick } from 'lucide-react'
import {
  subscribeReklam, getReklam, reklamEkle, reklamSil, reklamAktifDegistir,
  REKLAM_KONUMLARI, konumEtiket,
} from '../lib/reklam'

const konumBilgi = (v) => REKLAM_KONUMLARI.find((k) => k.v === v) || {}

// Ana sayfa yerleşim haritası — hangi reklamın nereye geldiği görünür & tıklayınca seçilir.
function YerlesimHaritasi({ secili, onSec }) {
  const Blok = ({ children }) => (
    <div className="rounded-lg bg-base-200 text-base-content/50 text-[11px] px-3 py-2 text-center">{children}</div>
  )
  const Yuva = ({ v, no }) => {
    const aktif = secili === v
    const b = konumBilgi(v)
    return (
      <button
        type="button"
        onClick={() => onSec(v)}
        className={`w-full rounded-lg px-3 py-2 text-[11px] font-semibold border-2 border-dashed transition flex items-center justify-center gap-1.5
          ${aktif ? 'border-primary bg-primary/15 text-primary' : 'border-primary/40 bg-primary/5 text-primary/80 hover:bg-primary/10'}`}
      >
        <span className={`w-4 h-4 rounded-full text-[10px] grid place-items-center ${aktif ? 'bg-primary text-primary-content' : 'bg-primary/30 text-primary'}`}>{no}</span>
        📢 {b.l?.replace('Ana sayfa · ', '')} reklamı
      </button>
    )
  }
  return (
    <div className="border border-base-300 rounded-2xl p-3 bg-base-100">
      <div className="text-[11px] font-semibold text-base-content/60 mb-2 flex items-center gap-1.5">
        <MousePointerClick size={13} /> Ana sayfa yerleşimi — kutuya dokun, o konumu seç
      </div>
      <div className="flex gap-2">
        {/* sol ray */}
        <button type="button" onClick={() => onSec('sol')}
          className={`hidden sm:flex w-10 shrink-0 rounded-lg border-2 border-dashed items-center justify-center text-[9px] font-semibold [writing-mode:vertical-rl] rotate-180 py-2 transition
            ${secili === 'sol' ? 'border-primary bg-primary/15 text-primary' : 'border-primary/40 bg-primary/5 text-primary/70 hover:bg-primary/10'}`}>
          Sol ray
        </button>
        {/* orta içerik */}
        <div className="flex-1 space-y-1.5">
          <Blok>🔍 Arama kutusu</Blok>
          <Blok>🤖 Yapay zekâ asistan</Blok>
          <Blok>🟧 Kategoriler</Blok>
          <Yuva v="anasayfa-1" no={1} />
          <Blok>📍 Sana yakın marketler</Blok>
          <Yuva v="anasayfa-2" no={2} />
          <Blok>🔥 En çok aranan ürünler</Blok>
          <Yuva v="liste" no={3} />
        </div>
        {/* sağ ray */}
        <button type="button" onClick={() => onSec('sag')}
          className={`hidden sm:flex w-10 shrink-0 rounded-lg border-2 border-dashed items-center justify-center text-[9px] font-semibold [writing-mode:vertical-rl] py-2 transition
            ${secili === 'sag' ? 'border-primary bg-primary/15 text-primary' : 'border-primary/40 bg-primary/5 text-primary/70 hover:bg-primary/10'}`}>
          Sağ ray
        </button>
      </div>
      <div className="text-[10px] text-base-content/40 mt-2">3 numaralı alan yalnızca kullanıcı arama yapınca görünür.</div>
    </div>
  )
}

export default function ReklamYonetimi() {
  const { reklamlar } = useSyncExternalStore(subscribeReklam, getReklam)
  const [f, setF] = useState({ konum: 'anasayfa-1', baslik: '', gorsel: '', hedef: '' })
  const [bekle, setBekle] = useState(false)
  const [hata, setHata] = useState('')

  const secB = konumBilgi(f.konum)

  async function ekle(e) {
    e.preventDefault()
    setBekle(true); setHata('')
    try { await reklamEkle(f); setF({ konum: f.konum, baslik: '', gorsel: '', hedef: '' }) }
    catch (err) { setHata(err.message || 'Eklenemedi') }
    finally { setBekle(false) }
  }

  return (
    <section className="bg-base-100 border border-base-300 rounded-3xl p-4 space-y-4">
      <h2 className="text-sm font-semibold text-base-content/70 flex items-center gap-1.5"><Megaphone size={16} /> Reklam Yönetimi</h2>

      {/* Yerleşim haritası — konum tam olarak nerede belli olsun */}
      <YerlesimHaritasi secili={f.konum} onSec={(v) => setF({ ...f, konum: v })} />

      {/* Ekleme formu */}
      <form onSubmit={ekle} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select value={f.konum} onChange={(e) => setF({ ...f, konum: e.target.value })} className="select select-bordered select-sm">
          {REKLAM_KONUMLARI.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
        </select>
        <input value={f.baslik} onChange={(e) => setF({ ...f, baslik: e.target.value })} placeholder="Başlık (opsiyonel)" className="input input-bordered input-sm" />

        {/* Seçilen konumun tam yeri + önerilen boyut */}
        <div className="sm:col-span-2 -mt-1 rounded-xl bg-primary/5 border border-primary/20 p-2.5 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-primary"><MapPin size={13} /> {secB.l}</div>
          <div className="text-base-content/60">{secB.aciklama}</div>
          <div className="text-base-content/50"><span className="badge badge-primary badge-outline badge-xs mr-1">Önerilen boyut</span>{secB.boyut}</div>
        </div>

        <input value={f.gorsel} onChange={(e) => setF({ ...f, gorsel: e.target.value })} placeholder="Görsel URL (afiş resmi)" className="input input-bordered input-sm sm:col-span-2" />
        <input value={f.hedef} onChange={(e) => setF({ ...f, hedef: e.target.value })} placeholder="Tıklanınca gidilecek link (opsiyonel)" className="input input-bordered input-sm sm:col-span-2" />
        <button type="submit" disabled={bekle} className="btn btn-primary btn-sm sm:col-span-2"><Plus size={16} /> Reklam ekle</button>
      </form>
      {hata && <div className="alert alert-error text-xs py-2">{hata}</div>}
      <p className="text-[11px] text-base-content/40">Görsel URL'sini bir yere yükleyip (ör. medya deposu / bir görsel barındırma) linkini buraya yapıştır. Bir konuma afiş eklemezsen o alanda otomatik “Reklamınız burada olabilir” çağrısı görünür.</p>

      {/* Liste */}
      <div className="space-y-2">
        {reklamlar.length === 0 && <div className="text-xs text-base-content/40 text-center py-3">Henüz reklam yok — yukarıdaki haritadan bir konum seçip ekle.</div>}
        {reklamlar.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border border-base-200 rounded-xl p-2">
            <div className="w-12 h-12 rounded-lg bg-base-200 overflow-hidden shrink-0 flex items-center justify-center">
              {r.gorsel ? <img src={r.gorsel} alt="" className="w-full h-full object-cover" /> : <Megaphone size={16} className="text-base-content/30" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{r.baslik || '(başlıksız)'}</div>
              <div className="text-[11px] text-base-content/50 truncate">
                <span className="badge badge-primary badge-outline badge-xs mr-1">{konumEtiket(r.konum)}</span>
                {r.hedef || 'link yok'}
              </div>
            </div>
            <button onClick={() => reklamAktifDegistir(r.id, !r.aktif)} className={`btn btn-xs btn-circle ${r.aktif ? 'btn-success' : 'btn-ghost'}`} title={r.aktif ? 'Aktif — kapat' : 'Pasif — aç'}>
              {r.aktif ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button onClick={() => reklamSil(r.id)} className="btn btn-xs btn-circle btn-ghost text-base-content/40"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </section>
  )
}

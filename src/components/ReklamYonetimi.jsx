import { useState, useSyncExternalStore } from 'react'
import { Megaphone, Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { subscribeReklam, getReklam, reklamEkle, reklamSil, reklamAktifDegistir } from '../lib/reklam'

const KONUMLAR = [
  { v: 'sol', l: 'Sol ray (masaüstü)' },
  { v: 'sag', l: 'Sağ ray (masaüstü)' },
  { v: 'anasayfa', l: 'Ana sayfa şeridi' },
  { v: 'liste', l: 'Sonuç listesi' },
]

// Konuma göre önerilen afiş boyutu
const BOYUT = {
  sol: '160 × 600 px — dikey/uzun (skyscraper)',
  sag: '160 × 600 px — dikey/uzun (skyscraper)',
  anasayfa: '728 × 90 px — yatay afiş (leaderboard)',
  liste: '300 × 250 px — kutu (medium rectangle)',
}

export default function ReklamYonetimi() {
  const { reklamlar } = useSyncExternalStore(subscribeReklam, getReklam)
  const [f, setF] = useState({ konum: 'sol', baslik: '', gorsel: '', hedef: '' })
  const [bekle, setBekle] = useState(false)
  const [hata, setHata] = useState('')

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

      {/* Ekleme formu */}
      <form onSubmit={ekle} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select value={f.konum} onChange={(e) => setF({ ...f, konum: e.target.value })} className="select select-bordered select-sm">
          {KONUMLAR.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
        </select>
        <input value={f.baslik} onChange={(e) => setF({ ...f, baslik: e.target.value })} placeholder="Başlık (opsiyonel)" className="input input-bordered input-sm" />
        <div className="sm:col-span-2 -mt-1 flex items-center gap-2 text-xs">
          <span className="badge badge-primary badge-outline">Önerilen boyut</span>
          <span className="font-medium">{BOYUT[f.konum]}</span>
        </div>
        <input value={f.gorsel} onChange={(e) => setF({ ...f, gorsel: e.target.value })} placeholder="Görsel URL (afiş resmi)" className="input input-bordered input-sm sm:col-span-2" />
        <input value={f.hedef} onChange={(e) => setF({ ...f, hedef: e.target.value })} placeholder="Tıklanınca gidilecek link (opsiyonel)" className="input input-bordered input-sm sm:col-span-2" />
        <button type="submit" disabled={bekle} className="btn btn-primary btn-sm sm:col-span-2"><Plus size={16} /> Reklam ekle</button>
      </form>
      {hata && <div className="alert alert-error text-xs py-2">{hata}</div>}
      <p className="text-[11px] text-base-content/40">Görsel URL'sini bir yere yükleyip (ör. kendi sunucun / bir görsel barındırma) linkini buraya yapıştır. Sol/sağ raylar için ~160×600 dikey afiş idealdir.</p>

      {/* Liste */}
      <div className="space-y-2">
        {reklamlar.length === 0 && <div className="text-xs text-base-content/40 text-center py-3">Henüz reklam yok.</div>}
        {reklamlar.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border border-base-200 rounded-xl p-2">
            <div className="w-12 h-12 rounded-lg bg-base-200 overflow-hidden shrink-0 flex items-center justify-center">
              {r.gorsel ? <img src={r.gorsel} alt="" className="w-full h-full object-cover" /> : <Megaphone size={16} className="text-base-content/30" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{r.baslik || '(başlıksız)'}</div>
              <div className="text-[11px] text-base-content/50 truncate">
                <span className="badge badge-ghost badge-xs mr-1">{r.konum}</span>
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

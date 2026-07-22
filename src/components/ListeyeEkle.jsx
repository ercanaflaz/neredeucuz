import { useState, useSyncExternalStore } from 'react'
import { ListPlus, Check, X, Plus, Bookmark } from 'lucide-react'
import { subscribe, getSnapshot, kayitliListeOlustur, kayitliListeyeEkle } from '../lib/akilliSepet'

// Bir ürünü kayıtlı listeye ekleme düğmesi + seçim penceresi.
// Liste yoksa isim sorar (yeni liste), varsa hangi listeye ekleneceğini seçtirir.
export default function ListeyeEkle({ urun, variant = 'mini', className = '' }) {
  const s = useSyncExternalStore(subscribe, getSnapshot)
  const [acik, setAcik] = useState(false)
  const [yeni, setYeni] = useState(false)
  const [ad, setAd] = useState('')
  const [eklendi, setEklendi] = useState(null)

  const listeler = s.listelerim || []
  const kalem = { terim: urun.title, marka: urun.brand }

  function ac(e) {
    e?.preventDefault(); e?.stopPropagation()
    setAcik(true); setYeni(listeler.length === 0); setAd(''); setEklendi(null)
  }
  function kapat() { setAcik(false); setYeni(false); setAd('') }

  async function mevcutaEkle(l) {
    await kayitliListeyeEkle(l.id, kalem)
    setEklendi(l.ad); setTimeout(kapat, 900)
  }
  async function yeniOlustur(e) {
    e?.preventDefault()
    const k = await kayitliListeOlustur(ad.trim() || 'Listem', [kalem])
    setEklendi(k.ad); setTimeout(kapat, 900)
  }

  return (
    <>
      {variant === 'mini' ? (
        <button onClick={ac} className={`inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline ${className}`}>
          <ListPlus size={13} /> Listeye ekle
        </button>
      ) : (
        <button onClick={ac} className={`btn btn-outline ${className}`}>
          <ListPlus size={18} /> Listeye ekle
        </button>
      )}

      {acik && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-3" onClick={kapat}>
          <div className="bg-base-100 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="font-semibold flex items-center gap-1.5"><Bookmark size={16} className="text-primary" /> Listeye ekle</div>
              <button onClick={kapat} className="btn btn-ghost btn-xs btn-circle"><X size={16} /></button>
            </div>
            <div className="text-xs text-base-content/60 line-clamp-1">{urun.title}</div>

            {eklendi ? (
              <div className="text-sm bg-success/10 text-success rounded-xl p-3 flex items-center gap-2">
                <Check size={16} /> <b>"{eklendi}"</b> listesine eklendi.
              </div>
            ) : yeni ? (
              <form onSubmit={yeniOlustur} className="space-y-2">
                <input value={ad} onChange={(e) => setAd(e.target.value)} autoFocus placeholder="Liste adı (ör. Aylık market)" className="input input-bordered w-full" />
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary flex-1"><Plus size={16} /> Oluştur ve ekle</button>
                  {listeler.length > 0 && <button type="button" onClick={() => setYeni(false)} className="btn btn-ghost">← Geri</button>}
                </div>
              </form>
            ) : (
              <div className="space-y-1.5">
                <div className="text-[11px] text-base-content/50">Hangi listeye eklensin?</div>
                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  {listeler.map((l) => (
                    <button key={l.id} onClick={() => mevcutaEkle(l)} className="w-full text-left bg-base-200 hover:bg-base-300 rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="font-medium">{l.ad}</span>
                      <span className="text-[11px] text-base-content/50">{l.urunler?.length || 0} ürün</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => { setYeni(true); setAd('') }} className="btn btn-outline btn-sm w-full"><Plus size={16} /> Yeni liste oluştur</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

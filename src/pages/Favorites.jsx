import { useSyncExternalStore, useState } from 'react'
import { Heart, Bell, Trash2, Loader2 } from 'lucide-react'
import { subscribe, getSnapshot, favoriSil, alarmSil } from '../lib/store'
import { searchByBarcode, searchByKeyword, normalize } from '../lib/marketfiyati'
import { tl } from '../lib/format'

export default function Favorites({ onSelect, user }) {
  const store = useSyncExternalStore(subscribe, getSnapshot)
  const [aciliyor, setAciliyor] = useState(null)

  // Favori kaydından güncel fiyatı çekip detaya götür
  async function acDetay(fav) {
    setAciliyor(fav.id)
    try {
      let res = await searchByKeyword(fav.baslik, store.konum)
      let list = normalize(res, store.konum)
      let bul = list.find((u) => u.id === fav.urun_id) || list[0]
      if (bul) onSelect(bul)
    } finally {
      setAciliyor(null)
    }
  }

  return (
    <div className="space-y-6">
      {!user && (
        <div className="alert text-xs py-2">Favori ve alarmların bu cihazda tutuluyor. <a href="#/giris" className="link link-primary">Giriş yap</a> → tüm cihazlarında görünsün.</div>
      )}
      <section>
        <h2 className="text-sm font-semibold text-base-content/60 mb-2 flex items-center gap-1.5">
          <Heart size={16} /> Favori ürünler
        </h2>
        {store.yukleniyor && <div className="flex justify-center py-6"><Loader2 className="animate-spin text-base-content/40" /></div>}
        {!store.yukleniyor && !store.favoriler.length && (
          <p className="text-sm text-base-content/50">Henüz favori yok. Bir ürünü açıp kalbe dokun.</p>
        )}
        <div className="space-y-2">
          {store.favoriler.map((f) => (
            <div key={f.id} className="bg-base-100 rounded-2xl p-3 border border-base-300 flex gap-3 items-center">
              <button onClick={() => acDetay(f)} className="flex gap-3 items-center flex-1 min-w-0 text-left">
                <div className="w-12 h-12 rounded-lg bg-base-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {f.gorsel ? <img src={f.gorsel} alt="" className="w-full h-full object-contain" /> : null}
                </div>
                <div className="min-w-0">
                  <div className="font-medium leading-tight line-clamp-2">{f.baslik}</div>
                  <div className="text-xs text-base-content/50">{f.marka}</div>
                </div>
                {aciliyor === f.id && <Loader2 size={16} className="animate-spin ml-auto" />}
              </button>
              <button onClick={() => favoriSil(f.id)} className="btn btn-ghost btn-sm btn-circle text-base-content/40">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-base-content/60 mb-2 flex items-center gap-1.5">
          <Bell size={16} /> Fiyat takibi
        </h2>
        {!store.alarmlar.length && (
          <p className="text-sm text-base-content/50">Henüz takip ettiğin ürün yok. Bir ürünü açıp <b>“Fiyat düşünce haber ver”</b>e dokun; fiyat düşünce sana bildirim gelir.</p>
        )}
        <div className="space-y-2">
          {store.alarmlar.map((a) => {
            const dustu = a.son_fiyat != null && Number(a.son_fiyat) < Number(a.hedef_fiyat)
            return (
              <div key={a.id} className="bg-base-100 rounded-2xl p-3 border border-base-300 flex gap-3 items-center">
                <div className="flex-1 min-w-0">
                  <div className="font-medium leading-tight line-clamp-1">{a.baslik}</div>
                  <div className="text-xs text-base-content/50">
                    🔔 <span className="text-secondary font-medium">{tl(a.hedef_fiyat)}</span> altına inince haber vereceğiz
                    {a.son_fiyat != null && <> · güncel {tl(a.son_fiyat)}{dustu && <span className="text-green-600 font-semibold"> ↓ düştü!</span>}</>}
                  </div>
                </div>
                <button onClick={() => alarmSil(a.id)} className="btn btn-ghost btn-sm btn-circle text-base-content/40" title="Takibi kaldır">
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

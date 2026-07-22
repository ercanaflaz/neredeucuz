import { useSyncExternalStore } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { subscribe, getSnapshot, konumIste, konumSormaKapat } from '../lib/store'

// 1. ADIM: Siteye ilk girişte SADECE konum ister.
// Konum kararı verilince kapanır; ardından giriş önerisi (GirisOnerisi) çıkar.
export default function LocationGate() {
  const store = useSyncExternalStore(subscribe, getSnapshot)

  if (store.konumSoruldu || store.konumDurumu === 'tamam') return null

  const bekliyor = store.konumDurumu === 'isteniyor'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-base-100 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <MapPin size={30} />
        </div>
        <div>
          <h2 className="text-lg font-bold">Bölgeni öğrenelim</h2>
          <p className="text-sm text-base-content/60 mt-1">
            Konumunu paylaş; sana <b>en yakın marketleri</b> ve o bölgedeki
            <b> güncel fiyatları</b> getirelim.
          </p>
        </div>
        <div className="space-y-2">
          <button onClick={konumIste} disabled={bekliyor} className="btn btn-primary w-full">
            {bekliyor ? <Loader2 className="animate-spin" size={18} /> : <MapPin size={18} />}
            Konumumu paylaş
          </button>
          <button onClick={konumSormaKapat} disabled={bekliyor} className="btn btn-ghost btn-sm w-full">
            Şimdi değil
          </button>
        </div>
        <p className="text-[11px] text-base-content/40">
          Konum sadece yakın fiyatları göstermek için kullanılır, kaydedilmez.
        </p>
      </div>
    </div>
  )
}

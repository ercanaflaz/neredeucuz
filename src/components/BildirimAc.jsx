import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'
import { pushDestekli, pushIzin, pushAboneMi, pushAc, pushKapat, iosStandaloneGerekli } from '../lib/push'

// "Bildirimleri aç" düğmesi/kartı. Fiyat düşünce ve kampanyalarda haber verir.
export default function BildirimAc({ className = '' }) {
  const [abone, setAbone] = useState(false)
  const [bekle, setBekle] = useState(false)
  const [hata, setHata] = useState('')
  const destek = pushDestekli()
  const iosGerek = destek && iosStandaloneGerekli()

  useEffect(() => { pushAboneMi().then(setAbone) }, [])

  async function ac() {
    setBekle(true); setHata('')
    try { await pushAc(); setAbone(true) }
    catch (e) {
      if (String(e.message) === 'izin-yok') setHata('Bildirim izni verilmedi. Tarayıcı ayarlarından açabilirsin.')
      else setHata('Bildirim açılamadı.')
    } finally { setBekle(false) }
  }
  async function kapat() {
    setBekle(true); setHata('')
    try { await pushKapat(); setAbone(false) } finally { setBekle(false) }
  }

  if (!destek) return null

  return (
    <div className={`rounded-2xl border border-base-300 bg-base-100 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${abone ? 'bg-primary/15 text-primary' : 'bg-base-200 text-base-content/50'}`}>
          {abone ? <BellRing size={20} /> : <Bell size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm">Bildirimler</div>
          <p className="text-xs text-base-content/60 mt-0.5">
            Takip ettiğin ürün ucuzlayınca ve fırsatlarda <b>anında haber</b> verelim.
          </p>

          {iosGerek ? (
            <div className="mt-2 text-[11px] text-warning-content bg-warning/15 rounded-lg p-2">
              iPhone'da bildirim için önce uygulamayı <b>Ana Ekrana ekle</b>, sonra açılan uygulamadan bildirimi aç.
            </div>
          ) : pushIzin() === 'denied' ? (
            <div className="mt-2 text-[11px] text-error bg-error/10 rounded-lg p-2">
              Bildirim izni tarayıcıda engellenmiş. Site ayarlarından "Bildirimler"i izin ver yap.
            </div>
          ) : (
            <button
              onClick={abone ? kapat : ac}
              disabled={bekle}
              className={`btn btn-sm rounded-xl mt-2 ${abone ? 'btn-ghost border border-base-300' : 'btn-primary'}`}
            >
              {bekle ? <Loader2 size={16} className="animate-spin" /> : abone ? <BellOff size={16} /> : <Bell size={16} />}
              {abone ? 'Bildirimleri kapat' : 'Bildirimleri aç'}
            </button>
          )}
          {hata && <div className="text-[11px] text-error mt-1.5">{hata}</div>}
        </div>
      </div>
    </div>
  )
}

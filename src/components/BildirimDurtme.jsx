import { useEffect, useState } from 'react'
import { BellRing, X, Loader2 } from 'lucide-react'
import { pushDestekli, pushIzin, pushAboneMi, pushAc, iosStandaloneGerekli } from '../lib/push'

const K = 'ne_bildirim_durtme'

// Girişten sonra çıkan kibar "Bildirimleri aç" hatırlatması.
// Tarayıcı izin penceresi YALNIZCA kullanıcı butona basınca açılır (kural gereği).
// Zaten karar verilmişse (izin verildi/engellendi) ya da kapatılmışsa görünmez.
export default function BildirimDurtme() {
  const [goster, setGoster] = useState(false)
  const [bekle, setBekle] = useState(false)

  useEffect(() => {
    if (!pushDestekli() || iosStandaloneGerekli()) return
    if (pushIzin() !== 'default') return // granted/denied → rahatsız etme
    try { if (localStorage.getItem(K) === 'kapali') return } catch { /* yok */ }
    let iptal = false
    pushAboneMi().then((a) => {
      if (!a && !iptal) {
        // KVKK şeridiyle çakışmasın diye biraz gecikmeli göster
        setTimeout(() => { if (!iptal) setGoster(true) }, 5000)
      }
    })
    return () => { iptal = true }
  }, [])

  if (!goster) return null

  const ac = async () => {
    setBekle(true)
    try { await pushAc() } catch { /* izin verilmedi */ }
    finally { setBekle(false); setGoster(false) }
  }
  const kapat = () => {
    try { localStorage.setItem(K, 'kapali') } catch { /* yok */ }
    setGoster(false)
  }

  return (
    <div className="fixed z-[60] left-3 right-3 bottom-20 md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-base-100 border border-base-300 shadow-xl rounded-2xl p-4 flex gap-3 items-start">
        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
          <BellRing size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm">Fiyat düşünce haber verelim mi?</div>
          <p className="text-xs text-base-content/60 mt-0.5 leading-snug">
            Takip ettiğin ürün ucuzlayınca ve fırsatlarda <b>anında bildirim</b> gönderelim.
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={ac} disabled={bekle} className="btn btn-primary btn-sm rounded-xl flex-1">
              {bekle ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />} Bildirimleri aç
            </button>
            <button onClick={kapat} className="btn btn-ghost btn-sm rounded-xl">Şimdi değil</button>
          </div>
        </div>
        <button onClick={kapat} className="btn btn-ghost btn-xs btn-circle -mt-1 -mr-1" aria-label="Kapat"><X size={14} /></button>
      </div>
    </div>
  )
}

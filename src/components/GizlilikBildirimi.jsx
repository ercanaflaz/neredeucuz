import { useEffect, useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import { izinDurumu, izinVer } from '../lib/izleme'

// Küçük, kapatılabilir KVKK bilgilendirme şeridi (alt köşe).
// Anonim analitik topladığımızı bildirir; kullanıcı "Reddet" derse takip durur.
export default function GizlilikBildirimi() {
  const [goster, setGoster] = useState(false)

  useEffect(() => {
    // Karar verilmemişse göster (varsayılan: anonim izinli, ama bilgilendiriyoruz)
    if (izinDurumu() == null) {
      const t = setTimeout(() => setGoster(true), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  if (!goster) return null

  const kabul = () => { izinVer(true); setGoster(false) }
  const reddet = () => { izinVer(false); setGoster(false) }

  return (
    <div className="fixed z-[60] left-3 right-3 bottom-20 md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-base-100 border border-base-300 shadow-xl rounded-2xl p-4 flex gap-3 items-start">
        <ShieldCheck size={22} className="text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-base-content/80 leading-snug">
            Deneyimini iyileştirmek için <b>anonim</b> kullanım verisi topluyoruz.
            Kişisel bilgin ya da tam adresin <b>saklanmaz</b>.
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={kabul} className="btn btn-primary btn-sm rounded-xl flex-1">Tamam</button>
            <button onClick={reddet} className="btn btn-ghost btn-sm rounded-xl">Reddet</button>
          </div>
        </div>
        <button onClick={kabul} className="btn btn-ghost btn-xs btn-circle -mt-1 -mr-1" aria-label="Kapat"><X size={14} /></button>
      </div>
    </div>
  )
}

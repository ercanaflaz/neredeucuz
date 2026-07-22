import { useState, useSyncExternalStore } from 'react'
import { Download, Share, X, SquarePlus } from 'lucide-react'
import { subscribePWA, getPWA, pwaYukle } from '../lib/pwa'

// Akıllı "Ana ekrana ekle" düğmesi:
//  - Android/Chromium: tek dokunuşla sistemin yükleme penceresini açar.
//  - iOS Safari: otomatik olmaz → kısa 3 adımlık rehber gösterir.
//  - Zaten kuruluysa görünmez.
export default function UygulamayiYukle({ className = '' }) {
  const s = useSyncExternalStore(subscribePWA, getPWA)
  const [rehber, setRehber] = useState(false)

  const stil = `inline-flex items-center gap-2 rounded-full bg-white text-primary font-bold text-sm sm:text-base px-6 py-3 shadow-lg shadow-black/15 ring-2 ring-white/70 hover:scale-[1.04] active:scale-95 transition ${className}`

  if (s.kurulu) return null

  // Android / masaüstü Chrome — gerçek tek dokunuş kurulum
  if (s.yuklenebilir) {
    return (
      <button onClick={() => pwaYukle()} className={stil}>
        <Download size={20} className="text-secondary" /> Uygulamayı yükle
      </button>
    )
  }

  // iOS — otomatik yok, kısa rehber
  if (s.ios) {
    return (
      <>
        <button onClick={() => setRehber(true)} className={stil}>
          <Download size={20} className="text-secondary" /> Ana ekrana ekle
        </button>
        {rehber && (
          <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4 text-base-content" onClick={() => setRehber(false)}>
            <div className="bg-base-100 rounded-2xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="font-bold text-lg">iPhone’a nasıl eklenir?</div>
                <button onClick={() => setRehber(false)} className="btn btn-ghost btn-sm btn-circle"><X size={18} /></button>
              </div>
              <p className="text-sm text-base-content/60">iOS güvenlik nedeniyle otomatik eklemeye izin vermiyor — 3 adımda sen ekle:</p>
              <ol className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-content grid place-items-center text-sm font-bold shrink-0">1</span>
                  <span className="text-sm">Safari’de alttaki <b>Paylaş</b> <Share size={15} className="inline -mt-0.5 text-blue-500" /> düğmesine dokun</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-content grid place-items-center text-sm font-bold shrink-0">2</span>
                  <span className="text-sm">Listeyi aşağı kaydır, <b>“Ana Ekrana Ekle”</b> <SquarePlus size={15} className="inline -mt-0.5" /> seç</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-content grid place-items-center text-sm font-bold shrink-0">3</span>
                  <span className="text-sm">Sağ üstten <b>“Ekle”</b>ye dokun — bitti ✓</span>
                </li>
              </ol>
              <button onClick={() => setRehber(false)} className="btn btn-primary w-full">Anladım</button>
            </div>
          </div>
        )}
      </>
    )
  }

  return null
}

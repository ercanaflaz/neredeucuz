import { useState, useEffect, useSyncExternalStore } from 'react'
import { PlayCircle, X } from 'lucide-react'
import { subscribeAyar, getAyar, ayarGetir } from '../lib/ayarlar'

// YouTube linkini gömme (embed) adresine çevir.
function youtubeEmbed(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0` : null
}

// "Nasıl kullanılır?" düğmesi + sayfa içi video penceresi (modal).
// Video URL'si admin panelinden ayarlanır (ayar: nasil_video). Yoksa düğme görünmez.
export default function NasilKullanilir({ className = '' }) {
  useSyncExternalStore(subscribeAyar, getAyar)
  const url = ayarGetir('nasil_video')
  const [acik, setAcik] = useState(false)

  useEffect(() => {
    if (!acik) return
    const f = (e) => { if (e.key === 'Escape') setAcik(false) }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [acik])

  if (!url) return null
  const yt = youtubeEmbed(url)

  return (
    <>
      <button
        onClick={() => setAcik(true)}
        className={`inline-flex items-center gap-2 rounded-full bg-white text-primary font-bold text-sm sm:text-base px-6 py-3 shadow-lg shadow-black/15 ring-2 ring-white/70 hover:scale-[1.04] active:scale-95 transition ${className}`}
      >
        <PlayCircle size={22} className="text-secondary" /> Nasıl kullanılır? · Video
      </button>

      {acik && (
        <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4" onClick={() => setAcik(false)}>
          <div className="relative w-full max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setAcik(false)} aria-label="Kapat" className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white grid place-items-center">
              <X size={22} />
            </button>
            <div className="rounded-2xl overflow-hidden bg-black shadow-2xl">
              {yt ? (
                <div className="aspect-video">
                  <iframe src={yt} title="Nasıl kullanılır" className="w-full h-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
                </div>
              ) : (
                <video src={url} controls autoPlay playsInline className="w-full max-h-[82vh] object-contain bg-black" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

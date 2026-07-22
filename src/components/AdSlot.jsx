import { useEffect } from 'react'
import { Megaphone, ArrowRight } from 'lucide-react'

// Google AdSense reklam yeri.
// Ücretli reklam (AdSense) aktifse onu gösterir; değilse "Reklamınız burada
// olabilir" çağrısını gösterir (boş/sönük kutu yerine satış fırsatı).
//
// KURULUM (yayına almadan önce):
// 1) AdSense hesabı aç, siteyi ekle/onaylat (neredeucuz.com.tr).
// 2) index.html <head> içine AdSense script'ini ekle:
//    <script async
//      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXX"
//      crossorigin="anonymous"></script>
// 3) .env / Cloudflare'e VITE_ADSENSE_CLIENT ve slot id'lerini ekle.
export default function AdSlot({ slot, className = '' }) {
  const client = import.meta.env.VITE_ADSENSE_CLIENT
  const aktif = Boolean(client && slot)

  useEffect(() => {
    if (!aktif) return
    try {
      // eslint-disable-next-line no-undef
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch { /* reklam yüklenemedi */ }
  }, [aktif])

  if (!aktif) {
    // Ücretli reklam yokken: "Reklamınız burada olabilir" çağrısı
    return (
      <a
        href="#/reklam-ver"
        className={`group block rounded-2xl overflow-hidden ${className}`}
        aria-label="Reklam vermek için tıklayın"
      >
        <div className="relative flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-primary/30 bg-gradient-to-r from-primary/10 via-base-100 to-secondary/10">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
            <Megaphone size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-base-content/80">Reklamınız burada olabilir</div>
            <div className="text-xs text-base-content/50 truncate">Binlerce alışverişçiye ulaşın — reklam vermek için tıklayın</div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 bg-primary text-primary-content text-sm font-semibold rounded-xl px-4 py-2 shrink-0 group-hover:scale-105 transition">
            Reklam Ver <ArrowRight size={16} />
          </span>
          <ArrowRight size={18} className="sm:hidden text-primary shrink-0" />
        </div>
      </a>
    )
  }

  return (
    <ins
      className={`adsbygoogle block ${className}`}
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}

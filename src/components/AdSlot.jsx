import { useEffect } from 'react'

// Google AdSense reklam yeri (yer tutucu).
//
// KURULUM (yayına almadan önce):
// 1) AdSense hesabı aç, siteyi ekle/onaylat (neredeucuz.pages.dev ya da alan adın).
// 2) index.html <head> içine AdSense script'ini ekle:
//    <script async
//      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXX"
//      crossorigin="anonymous"></script>
// 3) .env / Cloudflare'e VITE_ADSENSE_CLIENT ve reklam birimi slot id'lerini ekle.
//
// NOT: AdSense yalnızca WEB (PWA/site) içindir. Uygulamayı ileride
// gerçek native mobil (APK/iOS) yaparsan reklam için Google AdMob kullanılır.
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
    // Geliştirme/yer tutucu görünümü
    return (
      <div className={`rounded-2xl border border-dashed border-base-300 bg-base-100 text-base-content/40 text-xs flex items-center justify-center h-20 ${className}`}>
        reklam alanı (AdSense)
      </div>
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

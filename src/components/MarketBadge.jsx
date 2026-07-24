import { useState, useEffect } from 'react'
import { marka } from '../lib/markets'

// Marketin ORİJİNAL logosunu gösterir; logo yoksa ya da yüklenemezse markanın
// kendi kurumsal renk/tarzındaki yazı rozetine (wordmark) düşer.
export default function MarketBadge({ market, size = 'md' }) {
  const m = marka(market)
  const sm = size === 'sm'
  const [logoHata, setLogoHata] = useState(false)

  // market değişince hata durumunu sıfırla (liste içinde bileşen tekrar kullanılıyor).
  useEffect(() => { setLogoHata(false) }, [market])

  // 1) Orijinal logo
  if (m.logo && !logoHata) {
    return (
      <img
        src={m.logo}
        alt={m.ad || market || 'market'}
        loading="lazy"
        onError={() => setLogoHata(true)}
        className={`inline-block w-auto object-contain ${sm ? 'h-4' : 'h-5'}`}
        style={{ maxWidth: sm ? 70 : 92 }}
      />
    )
  }

  // 2) ŞOK gibi kutusuz, her harfi ayrı renkte kelime-logo
  if (m.stil === 'renkli' && Array.isArray(m.harfRenkleri)) {
    return (
      <span className={`font-extrabold tracking-tight leading-none ${sm ? 'text-xs' : 'text-sm'}`}>
        {[...m.ad].map((h, i) => (
          <span key={i} style={{ color: m.harfRenkleri[i % m.harfRenkleri.length] }}>{h}</span>
        ))}
      </span>
    )
  }

  // 3) Migros gibi kutusuz, sadece renkli kalın yazı
  if (m.stil === 'yazi') {
    return (
      <span className={`font-extrabold tracking-tight leading-none ${sm ? 'text-xs' : 'text-sm'}`} style={{ color: m.bg }}>
        {m.ad}
      </span>
    )
  }

  // 4) Kutu tarzı: markanın renginde kutu + kontrast yazı
  return (
    <span
      className={`inline-flex items-center rounded-md font-extrabold tracking-tight leading-none ${sm ? 'px-1.5 py-1 text-[11px]' : 'px-2 py-1 text-xs'}`}
      style={{ backgroundColor: m.bg, color: m.text }}
    >
      {m.ad}
    </span>
  )
}

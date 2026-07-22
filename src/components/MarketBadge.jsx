import { marka } from '../lib/markets'

// Marketin kendi kurumsal renk ve tarzında net "wordmark" rozeti.
export default function MarketBadge({ market, size = 'md' }) {
  const m = marka(market)
  const sm = size === 'sm'

  // Migros gibi kutusuz, sadece renkli kalın yazı
  if (m.stil === 'yazi') {
    return (
      <span className={`font-extrabold tracking-tight leading-none ${sm ? 'text-xs' : 'text-sm'}`} style={{ color: m.bg }}>
        {m.ad}
      </span>
    )
  }

  // Kutu tarzı: markanın renginde kutu + kontrast yazı
  return (
    <span
      className={`inline-flex items-center rounded-md font-extrabold tracking-tight leading-none ${sm ? 'px-1.5 py-1 text-[11px]' : 'px-2 py-1 text-xs'}`}
      style={{ backgroundColor: m.bg, color: m.text }}
    >
      {m.ad}
    </span>
  )
}

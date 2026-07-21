import { marka } from '../lib/markets'

// Marketin kendi renginde, adının okunduğu net rozet.
export default function MarketBadge({ market, size = 'md' }) {
  const m = marka(market)
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
  return (
    <span
      className={`inline-flex items-center rounded-md font-bold tracking-tight ${pad}`}
      style={{ backgroundColor: m.bg, color: m.text }}
    >
      {m.ad}
    </span>
  )
}

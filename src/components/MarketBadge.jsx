import { marka } from '../lib/markets'

// Marketin kendi renginde + kurumsal logosuyla net rozet.
export default function MarketBadge({ market, size = 'md' }) {
  const m = marka(market)
  const sm = size === 'sm'
  const pad = sm ? 'px-1.5 py-0.5 text-[11px] gap-1' : 'px-2 py-1 text-xs gap-1.5'
  return (
    <span
      className={`inline-flex items-center rounded-md font-bold tracking-tight ${pad}`}
      style={{ backgroundColor: m.bg, color: m.text }}
    >
      {m.logo && (
        <img
          src={m.logo}
          alt=""
          width="16"
          height="16"
          loading="lazy"
          className={`${sm ? 'w-3.5 h-3.5' : 'w-4 h-4'} rounded-[3px] bg-white object-contain p-[1px] shrink-0`}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      )}
      {m.ad}
    </span>
  )
}

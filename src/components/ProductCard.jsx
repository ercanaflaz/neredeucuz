import { tl, tasarrufYuzde } from '../lib/format'
import MarketBadge from './MarketBadge'

// Arama sonuç listesindeki tek ürün kartı.
export default function ProductCard({ urun, onClick }) {
  const tasarruf = tasarrufYuzde(urun.minPrice, urun.maxPrice)
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-base-100 rounded-2xl p-3 flex gap-3 items-center border border-base-300 hover:border-primary/40 active:scale-[0.99] transition"
    >
      <div className="w-16 h-16 rounded-xl bg-base-200 shrink-0 overflow-hidden flex items-center justify-center">
        {urun.imageUrl ? (
          <img src={urun.imageUrl} alt="" className="w-full h-full object-contain" loading="lazy" />
        ) : (
          <span className="text-base-content/30 text-xs">görsel yok</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium leading-tight line-clamp-2">{urun.title}</div>
        <div className="text-xs text-base-content/50 mt-0.5">{urun.brand}</div>
        <div className="text-xs text-base-content/50 mt-1">
          {urun.marketCount} markette karşılaştırıldı
        </div>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-1">
        <div className="text-[11px] text-base-content/50">en ucuz</div>
        <div className="font-bold text-primary text-lg leading-none">{tl(urun.minPrice)}</div>
        {urun.cheapest?.unitPrice && (
          <div className="text-[10px] text-base-content/40 leading-none">{urun.cheapest.unitPrice}</div>
        )}
        {urun.cheapest && <MarketBadge market={urun.cheapest.market} size="sm" />}
        {tasarruf > 0 && (
          <div className="text-[11px] text-secondary font-semibold">%{tasarruf} fark</div>
        )}
      </div>
    </button>
  )
}

import { tl, tasarrufYuzde } from '../lib/format'
import MarketBadge from './MarketBadge'
import ListeyeEkle from './ListeyeEkle'

// Arama sonuç listesindeki tek ürün kartı.
export default function ProductCard({ urun, onClick }) {
  const tasarruf = tasarrufYuzde(urun.minPrice, urun.maxPrice)
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="w-full text-left bg-base-100 rounded-2xl p-3 flex gap-3 items-center border border-base-300 hover:border-primary/40 active:scale-[0.99] transition cursor-pointer"
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
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-xs text-base-content/50">{urun.marketCount} markette karşılaştırıldı</span>
          {urun.kampanyali && <span className="text-[10px] font-semibold bg-secondary/15 text-secondary rounded px-1.5 py-0.5">🏷️ kampanya</span>}
        </div>
        <div className="mt-1.5"><ListeyeEkle urun={urun} /></div>
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
    </div>
  )
}

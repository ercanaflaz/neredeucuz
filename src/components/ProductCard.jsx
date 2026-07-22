import { tl, tasarrufYuzde } from '../lib/format'
import MarketBadge from './MarketBadge'
import ListeyeEkle from './ListeyeEkle'

// Arama sonuç kartı — görsel üstte büyük (marketfiyati tarzı dikey kart).
export default function ProductCard({ urun, onClick }) {
  const tasarruf = tasarrufYuzde(urun.minPrice, urun.maxPrice)
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="group bg-base-100 rounded-2xl border border-base-300 hover:border-primary/40 hover:shadow-md overflow-hidden flex flex-col cursor-pointer transition"
    >
      {/* Büyük görsel */}
      <div className="relative aspect-square bg-white p-3">
        {urun.imageUrl ? (
          <img src={urun.imageUrl} alt="" loading="lazy" className="w-full h-full object-contain group-hover:scale-[1.03] transition" />
        ) : (
          <div className="w-full h-full grid place-items-center text-base-content/30 text-xs">görsel yok</div>
        )}
        {tasarruf > 0 && (
          <span className="absolute top-2 left-2 text-[10px] font-bold bg-secondary text-secondary-content rounded-full px-2 py-0.5">%{tasarruf} fark</span>
        )}
        {urun.kampanyali && (
          <span className="absolute top-2 right-2 text-[10px] font-semibold bg-warning text-warning-content rounded-full px-1.5 py-0.5">🏷️</span>
        )}
        {/* Listeye ekle — masaüstünde görselin üzerine gelince */}
        <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
          <ListeyeEkle urun={urun} />
        </div>
      </div>

      {/* Bilgi */}
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <div className="font-medium text-sm leading-tight line-clamp-2 min-h-[2.4em]">{urun.title}</div>
        {urun.brand && <div className="text-[11px] text-base-content/40 -mt-0.5 truncate">{urun.brand}</div>}
        <div className="mt-auto pt-1 space-y-1">
          {urun.cheapest && <MarketBadge market={urun.cheapest.market} size="sm" />}
          <div className="flex items-end justify-between gap-1">
            <div>
              <div className="text-[10px] text-base-content/40 leading-none">en ucuz</div>
              <div className="text-lg font-extrabold text-primary leading-tight">{tl(urun.minPrice)}</div>
            </div>
            {urun.cheapest?.unitPrice && (
              <div className="text-[10px] text-base-content/40 text-right leading-none pb-0.5">{urun.cheapest.unitPrice}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

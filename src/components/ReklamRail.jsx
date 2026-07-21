import { useSyncExternalStore } from 'react'
import { subscribeReklam, getReklam, konumReklamlari } from '../lib/reklam'

// Tek bir reklam afişi (resim ya da html)
function Afis({ r }) {
  const govde = r.tip === 'html' && r.html
    ? <div dangerouslySetInnerHTML={{ __html: r.html }} />
    : r.gorsel
      ? <img src={r.gorsel} alt={r.baslik || 'reklam'} className="w-full rounded-2xl" loading="lazy" />
      : <div className="rounded-2xl bg-base-200 h-40 flex items-center justify-center text-xs text-base-content/40">{r.baslik || 'reklam'}</div>
  return r.hedef
    ? <a href={r.hedef} target="_blank" rel="noopener noreferrer sponsored" className="block hover:opacity-90 transition">{govde}</a>
    : govde
}

// Yan ray (sol/sag) — masaüstünde yapışkan reklam sütunu.
export default function ReklamRail({ konum, className = '' }) {
  useSyncExternalStore(subscribeReklam, getReklam)
  const list = konumReklamlari(konum)

  return (
    <aside className={className}>
      <div className="sticky top-20 space-y-3">
        {list.length > 0 ? (
          list.map((r) => <Afis key={r.id} r={r} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 text-base-content/30 text-[11px] flex flex-col items-center justify-center text-center gap-1 p-2" style={{ minHeight: 600 }}>
            <span>reklam alanı</span>
            <span className="text-base-content/25">160 × 600 px</span>
            <span className="text-base-content/25">(admin'den ekle)</span>
          </div>
        )}
      </div>
    </aside>
  )
}

// İçerik içinde yatay reklam (anasayfa/liste)
export function ReklamSerit({ konum }) {
  useSyncExternalStore(subscribeReklam, getReklam)
  const list = konumReklamlari(konum)
  if (!list.length) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {list.map((r) => <Afis key={r.id} r={r} />)}
    </div>
  )
}

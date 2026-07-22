import { useSyncExternalStore } from 'react'
import { subscribeReklam, getReklam, konumReklamlari } from '../lib/reklam'
import { Afis } from './ReklamRail'
import AdSlot from './AdSlot'

// İçerik arasına konan reklam yuvası:
//  1) Admin bu konuma afiş eklediyse → onu gösterir
//  2) Yoksa AdSense aktifse → AdSense reklamı
//  3) O da yoksa → "Reklamınız burada olabilir" çağrısı (AdSlot fallback)
export default function ReklamYuva({ konum, adsenseSlot, className = '' }) {
  useSyncExternalStore(subscribeReklam, getReklam)
  const list = konumReklamlari(konum)
  if (list.length > 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        {list.map((r) => <Afis key={r.id} r={r} />)}
      </div>
    )
  }
  return <AdSlot slot={adsenseSlot} className={className} />
}

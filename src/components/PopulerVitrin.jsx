import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import ProductCard from './ProductCard'
import { searchByKeyword, normalize } from '../lib/marketfiyati'

// Popüler ürün vitrini: en çok aranan terimlerin her biri için bölgedeki EN UCUZ
// ürünü bulup kart olarak gösterir (terim başına 1 temsilci ürün). marketfiyati
// indirim/kampanya verisi vermediği için "kampanya" değil, gerçek arama verisine
// dayalı popüler ürünler + en ucuz marketleri gösterilir.
export default function PopulerVitrin({ terimler, konum, onSelect, adet = 8 }) {
  const [urunler, setUrunler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const sonAnahtar = useRef(null)

  const secilen = (terimler || []).slice(0, adet)
  const anahtar =
    secilen.map((t) => t.terim).join('|') +
    '@' + (konum ? `${Number(konum.latitude).toFixed(2)},${Number(konum.longitude).toFixed(2)},${konum.distance || ''}` : 'yok')

  useEffect(() => {
    if (!secilen.length) { setUrunler([]); setYukleniyor(false); return }
    if (sonAnahtar.current === anahtar) return
    sonAnahtar.current = anahtar
    let iptal = false
    setYukleniyor(true)

    Promise.all(secilen.map(async (t) => {
      try {
        const liste = normalize(await searchByKeyword(t.terim, konum), konum)
        // En alakalı ilk sonuçlar içinden EN ÇOK MARKETTE bulunan ürünü seç: hem temsili
        // (mainstream) hem de "en ucuz nerede" karşılaştırması anlamlı olur. En ucuzu seçmek
        // uç/küçük paketleri (çilekli süt, sachet kahve) öne çıkarıyordu.
        const uygun = liste.filter((u) => u.minPrice != null && u.marketCount > 0).slice(0, 12)
        if (!uygun.length) return null
        uygun.sort((a, b) => b.marketCount - a.marketCount) // stable sort → eşitlikte alaka sırası korunur
        return { ...uygun[0], _terim: t.terim }
      } catch { return null }
    })).then((cikti) => {
      if (iptal) return
      const gorulen = new Set()
      const temiz = []
      for (const u of cikti) {
        if (!u || gorulen.has(u.id)) continue
        gorulen.add(u.id)
        temiz.push(u)
      }
      setUrunler(temiz)
      setYukleniyor(false)
    })
    return () => { iptal = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anahtar])

  if (yukleniyor) return (
    <div className="flex justify-center py-8 text-base-content/40"><Loader2 className="animate-spin" size={22} /></div>
  )
  if (!urunler.length) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
      {urunler.map((u) => <ProductCard key={u.id} urun={u} onClick={() => onSelect(u)} />)}
    </div>
  )
}

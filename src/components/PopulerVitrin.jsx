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
    setUrunler([])

    // Takılan bir istek tüm vitrini kilitlemesin — 8 sn'de null'a düş.
    const zamanAsimli = (p, ms) => Promise.race([
      Promise.resolve(p).catch(() => null),
      new Promise((res) => setTimeout(() => res(null), ms)),
    ])

    const birUrun = async (t) => {
      try {
        const yanit = await zamanAsimli(searchByKeyword(t.terim, konum), 8000)
        if (!yanit) return null
        const liste = normalize(yanit, konum)
        // En alakalı ilk sonuçlar içinden EN ÇOK MARKETTE bulunan ürünü seç: hem temsili
        // (mainstream) hem de "en ucuz nerede" karşılaştırması anlamlı olur.
        const uygun = liste.filter((u) => u.minPrice != null && u.marketCount > 0).slice(0, 12)
        if (!uygun.length) return null
        uygun.sort((a, b) => b.marketCount - a.marketCount) // stable sort → eşitlikte alaka sırası korunur
        return { ...uygun[0], _terim: t.terim }
      } catch { return null }
    }

    ;(async () => {
      const gorulen = new Set()
      const birikmis = []
      const BATCH = 3 // aynı anda en çok 3 istek — API'yi kilitlememek için
      for (let i = 0; i < secilen.length && !iptal; i += BATCH) {
        const cikti = await Promise.all(secilen.slice(i, i + BATCH).map(birUrun))
        if (iptal) return
        for (const u of cikti) { if (u && !gorulen.has(u.id)) { gorulen.add(u.id); birikmis.push(u) } }
        setUrunler([...birikmis])   // kartları geldikçe göster
        setYukleniyor(false)        // ilk parti gelince spinner'ı kaldır
      }
      if (!iptal) setYukleniyor(false)
    })()

    return () => { iptal = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anahtar])

  if (yukleniyor && !urunler.length) return (
    <div className="flex justify-center py-8 text-base-content/40"><Loader2 className="animate-spin" size={22} /></div>
  )
  if (!urunler.length) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
      {urunler.map((u) => <ProductCard key={u.id} urun={u} onClick={() => onSelect(u)} />)}
    </div>
  )
}

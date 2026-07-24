import { useState, useEffect, useRef, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import ProductCard from './ProductCard'
import { searchByKeyword, normalize } from '../lib/marketfiyati'
import { POPULER } from '../data/populer'

// Popüler ürün vitrini: en çok aranan terimlerden temsilci ürünler gösterir.
// - HER zaman `adet` (varsayılan 8) kart gelir: terim havuzu (gelen popüler + statik yedek)
//   karıştırılır ve 8 benzersiz ürün toplanana kadar çekilir. Ürün döndürmeyen/mükerrer
//   terimler atlanır, sıradaki denenir.
// - Her yüklemede farklı: havuz karıştırılır + her terim için ADAYLAR arasından rastgele biri.
// - Temsilci seçimi PUANA göre: çok markette olan (mainstream) + görselli öne çıkar;
//   "çilekli süt / bıldırcın yumurta / buzlu çay" gibi uç varyantlar geri düşer.
// marketfiyati indirim/kampanya vermediği için "kampanya" değil, gerçek arama verisine
// dayalı popüler ürünler + en ucuz marketleri gösterilir.

const OZEL = /çilekli|çikolatalı|kakaolu|muzlu|aromalı|vanilyalı|ballı|meyveli|buzlu|instant|ice ?tea|soğuk çay|light|laktozsuz|bıldırcın|glutensiz|şekersiz|dev boy|mini\b|sachet|hazır/i

function puan(u) {
  return (u.marketCount || 0) * 2 + (u.imageUrl ? 1 : 0) - (OZEL.test(u.title || '') ? 4 : 0)
}

function karistir(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function PopulerVitrin({ terimler, konum, onSelect, adet = 8 }) {
  const [urunler, setUrunler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const sonAnahtar = useRef(null)

  // Terim havuzu: gelen popüler terimler + statik yedek (dedup). 8'i garanti + çeşitlilik.
  const havuz = useMemo(() => {
    const gorulen = new Set()
    const liste = []
    for (const t of [...(terimler || []), ...POPULER]) {
      const k = (t.terim || '').toLocaleLowerCase('tr')
      if (!k || gorulen.has(k)) continue
      gorulen.add(k)
      liste.push(t)
    }
    return liste
  }, [terimler])

  const anahtar =
    havuz.map((t) => t.terim).join('|') +
    '@' + (konum ? `${Number(konum.latitude).toFixed(2)},${Number(konum.longitude).toFixed(2)},${konum.distance || ''}` : 'yok')

  useEffect(() => {
    if (!havuz.length) { setUrunler([]); setYukleniyor(false); return }
    if (sonAnahtar.current === anahtar) return
    sonAnahtar.current = anahtar
    let iptal = false
    setYukleniyor(true)
    setUrunler([])

    // Takılan bir istek vitrini kilitlemesin — 8 sn'de null'a düş.
    const zamanAsimli = (p, ms) => Promise.race([
      Promise.resolve(p).catch(() => null),
      new Promise((res) => setTimeout(() => res(null), ms)),
    ])

    const birUrun = async (t) => {
      try {
        const yanit = await zamanAsimli(searchByKeyword(t.terim, konum), 8000)
        if (!yanit) return null
        const liste = normalize(yanit, konum)
        const havuzU = liste.filter((u) => u.minPrice != null && u.marketCount > 0)
        if (!havuzU.length) return null
        // En alakalı ilk 12 → puana göre en iyi 5 → aralarından RASTGELE biri (çeşitlilik).
        const enIyi = havuzU.slice(0, 12).sort((a, b) => puan(b) - puan(a)).slice(0, 5)
        const sec = enIyi[Math.floor(Math.random() * enIyi.length)]
        return { ...sec, _terim: t.terim }
      } catch { return null }
    }

    ;(async () => {
      const gorulen = new Set()
      const birikmis = []
      const sirali = karistir(havuz)
      const BATCH = 4
      // 8 benzersiz ürün toplanana (ya da havuz bitene) kadar çek.
      for (let i = 0; i < sirali.length && !iptal && birikmis.length < adet; i += BATCH) {
        const cikti = await Promise.all(sirali.slice(i, i + BATCH).map(birUrun))
        if (iptal) return
        for (const u of cikti) {
          if (u && !gorulen.has(u.id) && birikmis.length < adet) { gorulen.add(u.id); birikmis.push(u) }
        }
        setUrunler(birikmis.slice(0, adet)) // geldikçe göster
        if (birikmis.length) setYukleniyor(false)
      }
      if (!iptal) setYukleniyor(false)
    })()

    // StrictMode (dev) effect'i iki kez çalıştırır: cleanup'ta ref'i sıfırla ki
    // ikinci (gerçek) mount fetch'i tekrar başlatsın — yoksa yerelde liste boş kalır.
    return () => { iptal = true; sonAnahtar.current = null }
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

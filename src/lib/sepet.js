// Sepet optimizasyonu: "hangi ürün nerede en ucuz" ve "tümü tek markette en ucuz".
import { marka } from './markets'

// items: [{ urun_id, baslik, adet, depots: [{market, price, unitPrice}] }]
export function sepetHesapla(items) {
  const kalemler = items.map((it) => {
    // ürünün geçtiği marketleri normalize et
    const fiyatlar = (it.depots ?? []).map((d) => ({
      marka: marka(d.market).ad,
      market: d.market,
      price: d.price,
    }))
    const enUcuz = fiyatlar.length ? fiyatlar.reduce((a, b) => (b.price < a.price ? b : a)) : null
    return { ...it, fiyatlar, enUcuz }
  })

  // Her ürünü en ucuzdan al (cherry-pick)
  let cherryTotal = 0
  let cherryTamMi = true
  for (const k of kalemler) {
    if (k.enUcuz) cherryTotal += k.enUcuz.price * k.adet
    else cherryTamMi = false
  }

  // Tek market seçenekleri: markete göre topla
  const markaSet = new Set()
  kalemler.forEach((k) => k.fiyatlar.forEach((f) => markaSet.add(f.marka)))

  const marketler = [...markaSet].map((ad) => {
    let total = 0
    let kapsanan = 0
    for (const k of kalemler) {
      const f = k.fiyatlar.find((x) => x.marka === ad)
      if (f) { total += f.price * k.adet; kapsanan += 1 }
    }
    return { ad, total, kapsanan, eksik: kalemler.length - kapsanan, tumVar: kapsanan === kalemler.length }
  })

  // Tümünü kapsayanlar arasında en ucuz; yoksa en çok kapsayan + en ucuz
  const tamKapsayan = marketler.filter((m) => m.tumVar).sort((a, b) => a.total - b.total)
  const enCokKapsayan = [...marketler].sort((a, b) => b.kapsanan - a.kapsanan || a.total - b.total)
  const enIyiTekMarket = tamKapsayan[0] || enCokKapsayan[0] || null

  const tekMarketTotal = enIyiTekMarket ? enIyiTekMarket.total : null
  const tasarruf = (tekMarketTotal != null && cherryTamMi) ? Math.max(0, tekMarketTotal - cherryTotal) : 0

  return {
    kalemler,
    cherryTotal,
    cherryTamMi,
    marketler: marketler.sort((a, b) => b.kapsanan - a.kapsanan || a.total - b.total),
    enIyiTekMarket,
    tasarruf,
    toplamAdet: items.reduce((s, i) => s + i.adet, 0),
  }
}

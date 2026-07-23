import { supabase } from './supabase'

// Kozmetik ürünlerini (kozmetik_urunler) çeker ve mağazalar arası EŞLEŞTİRİR.
// Aynı `eslesme` anahtarına sahip satırlar tek ürün olarak gruplanır; her mağazanın
// fiyatı yan yana gelir, en ucuz işaretlenir. Eşleşmesi olmayan ürün tek başına görünür.
export async function kozmetikGrupluYukle({ q = '', kategori = null } = {}) {
  let sorgu = supabase.from('kozmetik_urunler').select('*').limit(3000)
  if (kategori) sorgu = sorgu.eq('kategori', kategori)
  if (q && q.trim()) sorgu = sorgu.ilike('ad', `%${q.trim()}%`)
  const { data, error } = await sorgu
  if (error) { console.warn('kozmetik yükleme hatası:', error.message); return [] }

  // eslesme anahtarına göre grupla (yoksa kendi id'siyle tek başına)
  const gruplar = new Map()
  for (const r of data || []) {
    const key = r.eslesme || `tek-${r.id}`
    if (!gruplar.has(key)) gruplar.set(key, [])
    gruplar.get(key).push(r)
  }

  const sonuc = []
  for (const satirlar of gruplar.values()) {
    // Her mağazadan en ucuz fiyatı al (aynı mağazada tekrar varsa)
    const magazaMap = new Map()
    for (const s of satirlar) {
      if (s.fiyat == null) continue
      const ex = magazaMap.get(s.magaza)
      if (!ex || s.fiyat < ex.fiyat) magazaMap.set(s.magaza, s)
    }
    const magazalar = [...magazaMap.values()].sort((a, b) => a.fiyat - b.fiyat)
    if (!magazalar.length) continue
    const enUcuz = magazalar[0]
    const enPahali = magazalar[magazalar.length - 1]
    const ornek = satirlar.find((s) => s.gorsel) || enUcuz
    sonuc.push({
      anahtar: enUcuz.eslesme || `tek-${enUcuz.id}`,
      ad: ornek.ad,
      marka: ornek.marka,
      gorsel: ornek.gorsel,
      kategori: ornek.kategori,
      enUcuz: { magaza: enUcuz.magaza, fiyat: enUcuz.fiyat, url: enUcuz.url, stok: enUcuz.stok },
      magazalar: magazalar.map((s) => ({ magaza: s.magaza, fiyat: s.fiyat, stok: s.stok, url: s.url })),
      magazaSayisi: magazalar.length,
      tasarruf: magazalar.length > 1 ? Math.round((enPahali.fiyat - enUcuz.fiyat) * 100) / 100 : 0,
    })
  }

  // Karşılaştırmalı olanlar (2+ mağaza) üstte, sonra en ucuz fiyata göre
  sonuc.sort((a, b) => (b.magazaSayisi - a.magazaSayisi) || (a.enUcuz.fiyat - b.enUcuz.fiyat))
  return sonuc
}

// Mevcut kategorileri (adetleriyle) getir — filtre çipleri için.
export async function kozmetikKategoriler() {
  const { data, error } = await supabase.from('kozmetik_urunler').select('kategori')
  if (error || !data) return []
  const say = new Map()
  data.forEach((r) => { if (r.kategori) say.set(r.kategori, (say.get(r.kategori) || 0) + 1) })
  return [...say.entries()].sort((a, b) => b[1] - a[1]).map(([kategori, adet]) => ({ kategori, adet }))
}

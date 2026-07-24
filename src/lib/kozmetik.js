import { supabase } from './supabase'

// Mağazalar arası "aynı ürün" eşleştirme anahtarı — marka + ürün adındaki anlamlı
// kelimeler (sıralı, tekilleştirilmiş; boyut/stopword/marka tekrarı atılmış).
// Böylece kelime sırası ve fazla kelime farkları eşleşmeyi bozmaz.
const ES_STOP = new Set(['ve', 'ile', 'için', 'icin', 'yeni', 'set', 'paket', 'adet', 'ml', 'lt', 'l', 'gr', 'g', 'kg', 'cl', 'x', 'li', 'lu', 'lı', 'no', 'kadın', 'kadin', 'erkek', 'bayan', 'ea', 'the'])
const norm = (v) => (v || '').toLocaleLowerCase('tr').replace(/[^0-9a-zçğıöşü ]/gi, ' ').replace(/\s+/g, ' ').trim()
function anahtarUret(marka, ad) {
  const m = norm(marka)
  const markaTok = new Set(m.split(' ').filter(Boolean))
  let t = norm(ad).split(' ').filter((x) => x.length > 1 && !ES_STOP.has(x) && !markaTok.has(x) && !/^\d+$/.test(x))
  t = [...new Set(t)].sort()
  const k = (m + ' ' + t.join(' ')).trim()
  return k || null
}

// Tüm eşleşen satırları sayfa sayfa çeker (Supabase istek başına 1000 satır sınırı).
async function tumSatirlar({ q, kategori }) {
  const hepsi = []
  for (let off = 0; off < 15000; off += 1000) {
    let sorgu = supabase.from('kozmetik_urunler').select('*').order('id', { ascending: true }).range(off, off + 999)
    if (kategori) sorgu = sorgu.eq('kategori', kategori)
    if (q && q.trim()) sorgu = sorgu.ilike('ad', `%${q.trim()}%`)
    const { data, error } = await sorgu
    if (error) { console.warn('kozmetik yükleme hatası:', error.message); break }
    if (!data || !data.length) break
    hepsi.push(...data)
    if (data.length < 1000) break
  }
  return hepsi
}

// Ürünleri çeker ve mağazalar arası eşleştirir. Aynı anahtardaki satırlar tek ürün olur;
// her mağazanın en ucuz fiyatı yan yana gelir, en ucuz işaretlenir.
export async function kozmetikGrupluYukle({ q = '', kategori = null } = {}) {
  const satirlar = await tumSatirlar({ q, kategori })

  const gruplar = new Map()
  for (const r of satirlar) {
    const key = anahtarUret(r.marka, r.ad) || `tek-${r.id}`
    if (!gruplar.has(key)) gruplar.set(key, [])
    gruplar.get(key).push(r)
  }

  const sonuc = []
  for (const grup of gruplar.values()) {
    // Her mağazadan en ucuz fiyat
    const magazaMap = new Map()
    for (const s of grup) {
      if (s.fiyat == null) continue
      const ex = magazaMap.get(s.magaza)
      if (!ex || s.fiyat < ex.fiyat) magazaMap.set(s.magaza, s)
    }
    const magazalar = [...magazaMap.values()].sort((a, b) => a.fiyat - b.fiyat)
    if (!magazalar.length) continue
    const enUcuz = magazalar[0]
    const enPahali = magazalar[magazalar.length - 1]
    const ornek = grup.find((s) => s.gorsel) || enUcuz
    sonuc.push({
      anahtar: `${enUcuz.magaza}-${enUcuz.id}`,
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

// Mevcut kategorileri (adetleriyle) getir — filtre çipleri için. Sayfa sayfa sayar.
export async function kozmetikKategoriler() {
  const say = new Map()
  for (let off = 0; off < 15000; off += 1000) {
    const { data, error } = await supabase.from('kozmetik_urunler').select('kategori').order('id', { ascending: true }).range(off, off + 999)
    if (error || !data || !data.length) break
    data.forEach((r) => { if (r.kategori) say.set(r.kategori, (say.get(r.kategori) || 0) + 1) })
    if (data.length < 1000) break
  }
  return [...say.entries()].sort((a, b) => b[1] - a[1]).map(([kategori, adet]) => ({ kategori, adet }))
}

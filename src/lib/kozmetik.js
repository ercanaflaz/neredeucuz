import { supabase } from './supabase'

// Kozmetik ürünleri (Supabase kozmetik_urunler tablosu — Gratis vb. kazıyıcıdan).
// q: isim araması · kategori: 'maskara' gibi · sayfa/boyut: sayfalama.
export async function kozmetikYukle({ q = '', kategori = null, sayfa = 0, boyut = 40 } = {}) {
  let sorgu = supabase.from('kozmetik_urunler').select('*', { count: 'exact' })
  if (kategori) sorgu = sorgu.eq('kategori', kategori)
  if (q && q.trim()) sorgu = sorgu.ilike('ad', `%${q.trim()}%`)
  sorgu = sorgu
    .order('stok', { ascending: true, nullsFirst: false }) // 'var' önce
    .order('fiyat', { ascending: true })
    .range(sayfa * boyut, sayfa * boyut + boyut - 1)
  const { data, count, error } = await sorgu
  if (error) { console.warn('kozmetik yükleme hatası:', error.message); return { urunler: [], toplam: 0 } }
  return { urunler: data || [], toplam: count || 0 }
}

// Mevcut kategorileri (adetleriyle) getir — filtre çipleri için.
export async function kozmetikKategoriler() {
  const { data, error } = await supabase.from('kozmetik_urunler').select('kategori')
  if (error || !data) return []
  const say = new Map()
  data.forEach((r) => { if (r.kategori) say.set(r.kategori, (say.get(r.kategori) || 0) + 1) })
  return [...say.entries()].sort((a, b) => b[1] - a[1]).map(([kategori, adet]) => ({ kategori, adet }))
}

// Broşürler (market aktüel katalogları) — okuma + admin CRUD.
import { supabase } from './supabase'
import { getAuth } from './auth'

const uid = () => getAuth().user?.id || null

// Bilinen marketler için renk/kısaltma (logo yoksa şık rozet için)
export const MARKETLER = {
  'BİM': { renk: '#E30613' },
  'A101': { renk: '#0B4EA2' },
  'ŞOK': { renk: '#F7941D' },
  'Migros': { renk: '#E4032E' },
  'CarrefourSA': { renk: '#0056A4' },
  'Hakmar': { renk: '#D6001C' },
  'Tarım Kredi': { renk: '#1C7C34' },
  'Gratis': { renk: '#E6007E' },
  'Metro': { renk: '#003D8F' },
  'Diğer': { renk: '#64748b' },
}
export const MARKET_ADLARI = Object.keys(MARKETLER)
export function marketRenk(m) { return (MARKETLER[m] || MARKETLER['Diğer']).renk }

let cache = { brosurler: [], yuklendi: false }
const listeners = new Set()
const emit = () => { cache = { ...cache }; listeners.forEach((l) => l()) }
export function subscribeBrosur(l) { listeners.add(l); return () => listeners.delete(l) }
export function getBrosur() { return cache }

export async function brosurleriYukle() {
  try {
    const { data, error } = await supabase
      .from('brosurler')
      .select('*')
      .order('sira', { ascending: true })
      .order('created_at', { ascending: false })
    cache.brosurler = (!error && Array.isArray(data)) ? data : []
  } catch { cache.brosurler = [] }
  cache.yuklendi = true
  emit()
}

// Sadece aktif + tarihi geçmemiş olanlar (gösterim için)
export function aktifBrosurler() {
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0)
  return cache.brosurler.filter((b) => {
    if (!b.aktif) return false
    if (b.tarih_bit) { const bit = new Date(b.tarih_bit); bit.setHours(23, 59, 59, 999); if (bit < bugun) return false }
    return true
  })
}

// ---- Admin ----
export async function brosurEkle(b) {
  if (!uid()) throw new Error('Yetki yok')
  const { error } = await supabase.from('brosurler').insert({
    market: b.market, baslik: b.baslik || null, kategori: b.kategori || null,
    gorsel: b.gorsel || null, link: b.link || null,
    tarih_bas: b.tarih_bas || null, tarih_bit: b.tarih_bit || null,
    sira: b.sira ?? 0, aktif: b.aktif ?? true,
  })
  if (error) throw error
  await brosurleriYukle()
}
export async function brosurSil(id) {
  await supabase.from('brosurler').delete().eq('id', id)
  await brosurleriYukle()
}
export async function brosurAktifDegistir(id, aktif) {
  await supabase.from('brosurler').update({ aktif }).eq('id', id)
  await brosurleriYukle()
}

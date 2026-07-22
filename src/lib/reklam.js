// Reklam motoru: admin panelden yönetilen afişler. Konuma göre gösterilir.
// localStorage'a gerek yok; Supabase'ten okunur (yoksa boş, uygulama kırılmaz).
import { supabase } from './supabase'
import { getAuth } from './auth'
import { izle } from './izleme'

const uid = () => getAuth().user?.id || null

// ---- REKLAM KONUMLARI (tek kaynak: admin + sayfa aynı listeyi kullanır) ----
// v: kayıt anahtarı · l: kısa ad · aciklama: sayfada tam yeri · boyut: önerilen afiş
export const REKLAM_KONUMLARI = [
  { v: 'anasayfa-1', l: 'Ana sayfa · Kategoriler altı', aciklama: 'Kategori kutularının hemen altında (asistan ile marketler arası)', boyut: '728 × 90 px yatay afiş' },
  { v: 'anasayfa-2', l: 'Ana sayfa · Marketler altı', aciklama: '"Sana yakın marketler" ile "En çok aranan ürünler" arasında', boyut: '728 × 90 px yatay afiş' },
  { v: 'liste', l: 'Arama sonuçları arası', aciklama: 'Kullanıcı arama yapınca ürün listesinin altında', boyut: '300 × 250 px kutu' },
  { v: 'bildirim-1', l: 'Bildirimler · Liste üstü', aciklama: 'Bildirimler sayfasında, filtre sekmelerinin altında ve listenin üstünde', boyut: '300 × 250 px kutu' },
  { v: 'bildirim-2', l: 'Bildirimler · Liste altı', aciklama: 'Bildirimler sayfasında, bildirim listesinin en altında', boyut: '300 × 250 px kutu' },
  { v: 'sol', l: 'Sol yan ray (masaüstü)', aciklama: 'Masaüstünde içeriğin solundaki dikey sütun', boyut: '160 × 600 px dikey' },
  { v: 'sag', l: 'Sağ yan ray (masaüstü)', aciklama: 'Masaüstünde içeriğin sağındaki dikey sütun', boyut: '160 × 600 px dikey' },
]
export function konumEtiket(v) {
  return REKLAM_KONUMLARI.find((k) => k.v === v)?.l || v
}
// Eski 'anasayfa' kaydı yeni 'anasayfa-1' yuvasında da görünsün
const KONUM_ALIAS = { 'anasayfa-1': ['anasayfa-1', 'anasayfa'] }

let cache = { reklamlar: [], yuklendi: false, istatistik: {} }
const listeners = new Set()
const emit = () => { cache = { ...cache }; listeners.forEach((l) => l()) }
export function subscribeReklam(l) { listeners.add(l); return () => listeners.delete(l) }
export function getReklam() { return cache }

// ---- Reklam performansı (gösterim / tıklama) ----
// Aynı reklamın gösterimini bu sayfa yüklemesinde bir kez say.
const gosterildi = new Set()
export function reklamGoster(r) {
  if (!r?.id) return
  const k = 'g' + r.id
  if (gosterildi.has(k)) return
  gosterildi.add(k)
  try { izle('reklam_gosterim', { baslik: r.baslik || r.konum, detay: { id: String(r.id), konum: r.konum } }) } catch { /* yok */ }
}
export function reklamTik(r) {
  if (!r?.id) return
  try { izle('reklam_tik', { baslik: r.baslik || r.konum, detay: { id: String(r.id), konum: r.konum } }) } catch { /* yok */ }
}
// Admin: reklam başına gösterim/tıklama sayıları (son 30 gün)
export async function reklamIstatistikYukle() {
  try {
    const { data, error } = await supabase.rpc('reklam_istatistik')
    cache.istatistik = (!error && data && typeof data === 'object') ? data : {}
  } catch { cache.istatistik = {} }
  emit()
}

async function dene(fn) { try { return await fn() } catch { return { error: true } } }

// Tüm reklamları yükle (aktifler herkese, pasifler yalnız admine gelir - RLS).
export async function reklamlariYukle() {
  const { data, error } = await dene(() => supabase.from('reklamlar').select('*').order('sira', { ascending: true }))
  cache.reklamlar = (!error && Array.isArray(data)) ? data : []
  cache.yuklendi = true
  emit()
}

// Belirli konumdaki AKTİF reklamlar (gösterim için)
export function konumReklamlari(konum) {
  const keys = KONUM_ALIAS[konum] || [konum]
  return cache.reklamlar.filter((r) => keys.includes(r.konum) && r.aktif)
}

// ---- Admin CRUD ----
export async function reklamEkle(r) {
  if (!uid()) throw new Error('Yetki yok')
  const { error } = await supabase.from('reklamlar').insert({
    konum: r.konum, baslik: r.baslik || null, gorsel: r.gorsel || null,
    hedef: r.hedef || null, tip: r.tip || 'resim', html: r.html || null,
    aktif: r.aktif ?? true, sira: r.sira ?? 0,
  })
  if (error) throw error
  await reklamlariYukle()
}
export async function reklamSil(id) {
  await supabase.from('reklamlar').delete().eq('id', id)
  await reklamlariYukle()
}
export async function reklamAktifDegistir(id, aktif) {
  await supabase.from('reklamlar').update({ aktif }).eq('id', id)
  await reklamlariYukle()
}

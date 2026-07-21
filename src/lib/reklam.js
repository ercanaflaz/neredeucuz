// Reklam motoru: admin panelden yönetilen afişler. Konuma göre gösterilir.
// localStorage'a gerek yok; Supabase'ten okunur (yoksa boş, uygulama kırılmaz).
import { supabase } from './supabase'
import { getAuth } from './auth'

const uid = () => getAuth().user?.id || null

let cache = { reklamlar: [], yuklendi: false }
const listeners = new Set()
const emit = () => { cache = { ...cache }; listeners.forEach((l) => l()) }
export function subscribeReklam(l) { listeners.add(l); return () => listeners.delete(l) }
export function getReklam() { return cache }

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
  return cache.reklamlar.filter((r) => r.konum === konum && r.aktif)
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

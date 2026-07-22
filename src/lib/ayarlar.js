// Basit site ayarları (anahtar/değer). Herkese açık okunur (Supabase),
// localStorage'a önbelleklenir. Admin yazar. Örn: "nasil_video" (tanıtım videosu URL'si).
import { supabase } from './supabase'

const LS = 'neredeucuz_ayarlar'
function lsGet() { try { return JSON.parse(localStorage.getItem(LS) || '{}') } catch { return {} } }
function lsSet(o) { try { localStorage.setItem(LS, JSON.stringify(o)) } catch { /* yoksay */ } }

let cache = { ayarlar: lsGet(), yuklendi: false }
const listeners = new Set()
const emit = () => { cache = { ...cache }; listeners.forEach((l) => l()) }
export function subscribeAyar(l) { listeners.add(l); return () => listeners.delete(l) }
export function getAyar() { return cache }
export function ayarGetir(anahtar, def = null) {
  const v = cache.ayarlar[anahtar]
  return v == null ? def : v
}

export async function ayarlariYukle() {
  try {
    const { data, error } = await supabase.from('ayarlar').select('anahtar,deger')
    if (!error && Array.isArray(data)) {
      const o = {}
      data.forEach((r) => { o[r.anahtar] = r.deger })
      cache.ayarlar = o; lsSet(o)
    }
  } catch { /* Supabase yok — localStorage kalır */ }
  cache.yuklendi = true; emit()
}

export async function ayarKaydet(anahtar, deger) {
  cache.ayarlar = { ...cache.ayarlar, [anahtar]: deger }
  lsSet(cache.ayarlar); emit()
  try { await supabase.from('ayarlar').upsert({ anahtar, deger, guncelleme: new Date().toISOString() }, { onConflict: 'anahtar' }) } catch { /* yoksay */ }
}

// Uygulama içi bildirimler + okundu/okunmadı durumu.
// "Görülen" zamanı localStorage'da tutulur; ondan yeni olanlar "okunmamış" sayılır.
import { supabase } from './supabase'

const K = 'ne_bildirim_gorulen'
let state = { liste: [], okunmamis: 0, yuklendi: false }
const listeners = new Set()
const emit = () => { state = { ...state }; listeners.forEach((l) => l()) }

export function subscribeBildirim(l) { listeners.add(l); return () => listeners.delete(l) }
export function getBildirim() { return state }

export function sonGorulenMs() {
  try {
    const v = localStorage.getItem(K)
    return v ? new Date(v).getTime() : 0
  } catch { return 0 }
}

export async function bildirimleriYukle() {
  try {
    const { data, error } = await supabase
      .from('bildirimler')
      .select('id,baslik,govde,url,tur,created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    const taban = sonGorulenMs()
    state.liste = data || []
    state.okunmamis = (data || []).filter((b) => new Date(b.created_at).getTime() > taban).length
    state.yuklendi = true
    emit()
  } catch {
    state.yuklendi = true
    emit()
  }
}

// Hepsini "görüldü" işaretle (rozet sıfırlanır)
export function bildirimGoruldu() {
  try { localStorage.setItem(K, new Date().toISOString()) } catch { /* yok */ }
  state.okunmamis = 0
  emit()
}

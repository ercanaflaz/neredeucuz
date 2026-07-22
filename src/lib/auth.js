// Oturum katmanı: e-posta/şifre + Google/Facebook (OAuth) + rol (admin).
// useSyncExternalStore uyumlu abonelik sağlar.
import { supabase } from './supabase'

let state = { user: null, rol: null, loading: true }
const listeners = new Set()

const emit = () => {
  state = { ...state }
  listeners.forEach((l) => l())
}

export function subscribeAuth(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}
export function getAuth() {
  return state
}
export function adminMi() {
  return state.rol === 'admin'
}

// Kullanıcının rolünü profiller tablosundan çek (deadlock için ertelenmiş çağrılır).
async function rolCek(userId) {
  if (!userId) { state.rol = null; emit(); return }
  try {
    const { data, error } = await supabase.from('profiller').select('rol').eq('id', userId).maybeSingle()
    state.rol = (!error && data?.rol) ? data.rol : 'uye'
  } catch {
    state.rol = 'uye'
  }
  emit()
}

// Uygulama açılışında bir kez çağrılır (main.jsx).
export async function initAuth() {
  const { data } = await supabase.auth.getSession()
  state.user = data?.session?.user ?? null
  state.loading = false
  emit()
  if (state.user) setTimeout(() => rolCek(state.user.id), 0)

  supabase.auth.onAuthStateChange((_event, session) => {
    // KRİTİK: onAuthStateChange içinde doğrudan DB çağrısı yapma (deadlock).
    state.user = session?.user ?? null
    state.loading = false
    state.rol = null
    emit()
    if (state.user) setTimeout(() => rolCek(state.user.id), 0)
  })
}

export async function kayitOl(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function girisYap(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

// Sosyal giriş — sağlayıcı Supabase'de yapılandırıldıysa çalışır.
export async function googleIleGiris() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}
export async function facebookIleGiris() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function cikisYap() {
  await supabase.auth.signOut()
  // Çıkışta ana sayfaya dön (admin/hesap sayfasında kalmasın)
  try { window.location.hash = '#/' } catch { /* yok */ }
}

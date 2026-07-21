// Yapay zekâ katmanı (Gemini — Cloudflare fonksiyonu / Vite dev middleware).
// Anahtar yoksa listeyiAyristir basit ayrıştırıcıya düşer; oneriAl ise anahtar ister.
import { basitAyristir } from './akilliSepet'

// Serbest yazılan listeyi kalemlere çevir (anahtar yoksa basit ayrıştırıcı)
export async function listeyiAyristir(metin) {
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ metin, mod: 'liste' }),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.items) && data.items.length) return { items: data.items, kaynak: 'gemini' }
    }
  } catch { /* yok */ }
  return { items: basitAyristir(metin), kaynak: 'basit' }
}

// Konuşan asistan: kullanıcı isteğine cevap + önerilen ürünler.
// Anahtar yoksa { yok:true } döner (arayüz kullanıcıyı bilgilendirir).
export async function oneriAl(metin, mevcut = []) {
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ metin, mod: 'oneri', mevcut }),
    })
    if (res.status === 501) return { yok: true }
    const data = await res.json().catch(() => ({}))
    if (res.ok) return { reply: data.reply || '', items: Array.isArray(data.items) ? data.items : [], model: data.model }
    if (res.status === 429 || data.error === 'kota') return { kota: true, detay: data.detail }
    const detay = data.detail || `HTTP ${res.status}`
    console.warn('Gemini hata:', detay)
    return { hata: true, detay }
  } catch (e) {
    return { hata: true, detay: String(e) }
  }
}

// Uygulama veri katmanı: konum + yakın marketler + favoriler + alarmlar + sepet.
// useSyncExternalStore uyumlu (emit'te YENİ obje referansı şart).
import { supabase } from './supabase'
import { getAuth } from './auth'
import { nearestDepots, normalizeNearest } from './marketfiyati'
import { izle } from './izleme'

const LS_SEPET = 'neredeucuz_sepet'
const LS_FAV = 'neredeucuz_favoriler'
const LS_ALARM = 'neredeucuz_alarmlar'
const LS_KONUM_SORULDU = 'neredeucuz_konum_soruldu'
const LS_YARICAP = 'neredeucuz_yaricap'
const LS_KONUM = 'neredeucuz_konum' // { latitude, longitude } — yenilemede kaybolmasın

const yeniId = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2))
// Supabase best-effort: tablo yoksa/hata olursa sessizce yut, UI'ı kırma.
async function seDene(fn) { try { return await fn() } catch { return { error: true } } }

// Kullanıcının seçebileceği bölge yarıçapları (km)
export const YARICAP_SECENEKLERI = [5, 10, 20, 50]

function lsGet(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* yoksay */ }
}

const _yaricap0 = lsGet(LS_YARICAP, 20)
const _konum0 = lsGet(LS_KONUM, null) // önceki oturumdan kalan konum

let cache = {
  // Yenilemede konum kaybolmasın: localStorage'dan geri yükle.
  konum: _konum0 ? { ..._konum0, distance: _yaricap0 } : null,
  konumDurumu: _konum0 ? 'tamam' : 'idle', // idle | isteniyor | tamam | hata
  konumSoruldu: lsGet(LS_KONUM_SORULDU, false), // ilk giriş modalı için
  yaricap: _yaricap0, // seçili bölge yarıçapı (km)
  yakinMarketler: [], // [{ market, sube, mesafe }]
  // Tümü localStorage-öncelikli: Supabase yoksa da çalışır.
  favoriler: lsGet(LS_FAV, []),
  alarmlar: lsGet(LS_ALARM, []),
  sepet: lsGet(LS_SEPET, []),
  yukleniyor: false,
}
const listeners = new Set()
const emit = () => {
  cache = { ...cache }
  listeners.forEach((l) => l())
}
export function subscribe(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}
export function getSnapshot() {
  return cache
}

const uid = () => getAuth().user?.id || null

// ---- Konum ----
export function konumIste() {
  if (!('geolocation' in navigator)) {
    cache.konumDurumu = 'hata'; cache.konumSoruldu = true; lsSet(LS_KONUM_SORULDU, true); emit()
    return
  }
  cache.konumDurumu = 'isteniyor'; emit()
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const konum = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, distance: cache.yaricap }
      cache.konum = konum
      cache.konumDurumu = 'tamam'
      cache.konumSoruldu = true
      lsSet(LS_KONUM_SORULDU, true)
      lsSet(LS_KONUM, { latitude: konum.latitude, longitude: konum.longitude }) // kalıcı
      emit()
      yakinMarketleriYukle() // bölgedeki marketleri getir
    },
    () => {
      cache.konumDurumu = 'hata'; cache.konumSoruldu = true; lsSet(LS_KONUM_SORULDU, true); emit()
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
  )
}

// Uygulama açılışında çağrılır: konum izni daha önce verildiyse sessizce
// tazele. Kayıtlı konum varsa yakın marketleri de yükle.
export async function konumBaslat() {
  if (cache.konum) yakinMarketleriYukle() // kayıtlı konumla hemen bölge fiyatları

  if (!('permissions' in navigator) || !navigator.permissions?.query) {
    if (cache.konum) konumIste() // izin API'si yoksa ama konum vardıysa tazele
    return
  }
  try {
    const durum = await navigator.permissions.query({ name: 'geolocation' })
    if (durum.state === 'granted') {
      konumIste() // izin var: sessizce güncelle (modal çıkmaz)
    }
  } catch { /* yoksay */ }
}

// İlk giriş modalını bir daha gösterme (kullanıcı "şimdi değil" derse)
export function konumSormaKapat() {
  cache.konumSoruldu = true; lsSet(LS_KONUM_SORULDU, true); emit()
}

// Yakın marketleri her zaman geniş çekeriz; gösterim seçilen yarıçapa göre
// ANINDA süzülür (Home). Böylece yarıçap değişince liste anlık daralır/genişler.
const YAKIN_FETCH_KM = 50

// Kullanıcı bölge yarıçapını değiştirir (km). Liste anında (istemci tarafı) süzülür.
export function yaricapDegistir(km) {
  cache.yaricap = km
  lsSet(LS_YARICAP, km)
  if (cache.konum) cache.konum = { ...cache.konum, distance: km }
  emit() // yakinMarketler zaten 50 km yüklü → Home yarıçapa göre süzer
}

export async function yakinMarketleriYukle() {
  if (!cache.konum) return
  try {
    const res = await nearestDepots(cache.konum, YAKIN_FETCH_KM)
    cache.yakinMarketler = normalizeNearest(res).slice(0, 60)
    emit()
  } catch { /* yoksay */ }
}

// Union: urun_id'ye göre tekilleştir (öncelik: birinci dizi = uzak/güncel).
function birlestir(oncelikli, digeri) {
  const map = new Map()
  ;[...oncelikli, ...digeri].forEach((x) => { if (!map.has(x.urun_id)) map.set(x.urun_id, x) })
  return [...map.values()]
}

// ---- Favoriler (localStorage-öncelikli, Supabase opsiyonel senkron) ----
export async function favorileriYukle(userId) {
  cache.favoriler = lsGet(LS_FAV, []); emit()
  if (!userId) return
  const { data, error } = await seDene(() => supabase.from('favoriler').select('*').eq('kullanici_id', userId).order('eklendi', { ascending: false }))
  if (!error && Array.isArray(data)) {
    cache.favoriler = birlestir(data, cache.favoriler)
    lsSet(LS_FAV, cache.favoriler); emit()
  }
}
export async function favoriEkle(urun) {
  if (favoriMi(urun.id)) return
  const kayit = { id: yeniId(), urun_id: urun.id, baslik: urun.title, marka: urun.brand, gorsel: urun.imageUrl, eklendi: new Date().toISOString() }
  cache.favoriler = [kayit, ...cache.favoriler]; lsSet(LS_FAV, cache.favoriler); emit()
  const u = uid()
  if (u) seDene(() => supabase.from('favoriler').insert({ ...kayit, kullanici_id: u }))
}
export async function favoriSil(id) {
  cache.favoriler = cache.favoriler.filter((f) => f.id !== id); lsSet(LS_FAV, cache.favoriler); emit()
  if (uid()) seDene(() => supabase.from('favoriler').delete().eq('id', id))
}
export function favoriMi(urunId) {
  return cache.favoriler.some((f) => f.urun_id === urunId)
}

// ---- Fiyat alarmı (localStorage-öncelikli, Supabase opsiyonel) ----
export async function alarmlariYukle(userId) {
  cache.alarmlar = lsGet(LS_ALARM, []); emit()
  if (!userId) return
  const { data, error } = await seDene(() => supabase.from('fiyat_alarmlari').select('*').eq('kullanici_id', userId).order('olusturuldu', { ascending: false }))
  if (!error && Array.isArray(data)) {
    cache.alarmlar = birlestir(data, cache.alarmlar)
    lsSet(LS_ALARM, cache.alarmlar); emit()
  }
}
export async function alarmKur(urun, hedefFiyat) {
  const kayit = { id: yeniId(), urun_id: urun.id, baslik: urun.title, hedef_fiyat: hedefFiyat, son_fiyat: urun.minPrice, olusturuldu: new Date().toISOString() }
  cache.alarmlar = [kayit, ...cache.alarmlar]; lsSet(LS_ALARM, cache.alarmlar); emit()
  const u = uid()
  if (u) seDene(() => supabase.from('fiyat_alarmlari').insert({ ...kayit, kullanici_id: u }))
}
export async function alarmSil(id) {
  cache.alarmlar = cache.alarmlar.filter((a) => a.id !== id); lsSet(LS_ALARM, cache.alarmlar); emit()
  if (uid()) seDene(() => supabase.from('fiyat_alarmlari').delete().eq('id', id))
}

// ---- SEPET (localStorage-öncelikli, Supabase opsiyonel) ----
function depotSnapshot(urun) {
  return (urun.depots ?? []).map((d) => ({ market: d.market, price: d.price, unitPrice: d.unitPrice }))
}
function sepetKaydet() { lsSet(LS_SEPET, cache.sepet) }

export async function sepetiYukle(userId) {
  cache.sepet = lsGet(LS_SEPET, []); emit()
  if (!userId) return
  const { data, error } = await seDene(() => supabase.from('sepet').select('*').eq('kullanici_id', userId).order('eklendi', { ascending: true }))
  if (!error && Array.isArray(data) && data.length) {
    const remote = data.map((r) => ({ id: r.id, urun_id: r.urun_id, baslik: r.baslik, marka: r.marka, gorsel: r.gorsel, adet: r.adet, depots: r.depots ?? [] }))
    cache.sepet = birlestir(remote, cache.sepet)
    sepetKaydet(); emit()
  }
}

export async function sepeteEkle(urun, adet = 1) {
  const mevcut = cache.sepet.find((s) => s.urun_id === urun.id)
  if (mevcut) {
    const yeniAdet = mevcut.adet + adet
    cache.sepet = cache.sepet.map((s) => (s.id === mevcut.id ? { ...s, adet: yeniAdet } : s))
    sepetKaydet(); emit()
    const u = uid()
    if (u) seDene(() => supabase.from('sepet').update({ adet: yeniAdet }).eq('id', mevcut.id))
  } else {
    const kayit = { id: yeniId(), urun_id: urun.id, baslik: urun.title, marka: urun.brand, gorsel: urun.imageUrl, adet, depots: depotSnapshot(urun) }
    cache.sepet = [...cache.sepet, kayit]; sepetKaydet(); emit()
    const u = uid()
    if (u) seDene(() => supabase.from('sepet').insert({ ...kayit, kullanici_id: u }))
  }
}

export async function adetDegistir(id, yeni) {
  const it = cache.sepet.find((s) => s.id === id)
  if (!it) return
  if (yeni <= 0) return sepettenCikar(id)
  cache.sepet = cache.sepet.map((s) => (s.id === id ? { ...s, adet: yeni } : s))
  sepetKaydet(); emit()
  if (uid()) seDene(() => supabase.from('sepet').update({ adet: yeni }).eq('id', id))
}

export async function sepettenCikar(id) {
  cache.sepet = cache.sepet.filter((s) => s.id !== id); sepetKaydet(); emit()
  if (uid()) seDene(() => supabase.from('sepet').delete().eq('id', id))
}

export async function sepetiBosalt() {
  const ids = cache.sepet.map((s) => s.id)
  cache.sepet = []; sepetKaydet(); emit()
  if (uid()) seDene(() => supabase.from('sepet').delete().in('id', ids))
}

export function sepetteMi(urunId) {
  return cache.sepet.some((s) => s.urun_id === urunId)
}

// ---- Arama loglama (admin analitiği için, best-effort) ----
export function aramaLogla(terim) {
  const t = String(terim || '').trim()
  if (!t) return
  seDene(() => supabase.from('aramalar').insert({ terim: t.toLocaleLowerCase('tr'), kullanici_id: uid() }))
  // Analitik olay akışı (oturum zaman çizelgesinde görünsün)
  try { izle('arama', { baslik: t }) } catch { /* yok */ }
}

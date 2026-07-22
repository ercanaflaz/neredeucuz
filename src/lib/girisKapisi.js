// "Giriş gerekli" kapısı — misafir kullanıcı kişisel bir işlem yapmaya
// çalışınca (favori, liste, fiyat alarmı) giriş modalını açar.
// Basit pub/sub; React dışından da tetiklenebilir (store.js, akilliSepet.js).

let cache = { acik: false, islem: '' }
const listeners = new Set()
const emit = () => { cache = { ...cache }; listeners.forEach((l) => l()) }

export function subscribeGiris(l) { listeners.add(l); return () => listeners.delete(l) }
export function getGiris() { return cache }

// islem: kullanıcıya gösterilecek kısa metin, ör. "favorilere eklemek"
export function girisIste(islem = '') {
  cache = { acik: true, islem }
  listeners.forEach((l) => l())
}
export function girisKapat() {
  cache = { acik: false, islem: '' }
  listeners.forEach((l) => l())
}

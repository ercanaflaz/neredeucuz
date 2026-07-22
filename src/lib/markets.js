// Market marka kimliği: her zincirin kendi rengi, tarzı ve kısaltması.
// marketAdi API'den geldiği gibi eşleşir (küçük harf + içerir kontrolü).
// stil: 'kutu' → renkli kutu + beyaz/koyu yazı · 'yazi' → sadece renkli kalın yazı (ör. Migros)

const MARKALAR = [
  { anahtar: ['bim'],            ad: 'BİM',         bg: '#E4002B', text: '#ffffff', stil: 'kutu' },
  { anahtar: ['a101', 'a 101'],  ad: 'A101',        bg: '#C8102E', text: '#ffffff', stil: 'kutu' },
  { anahtar: ['sok', 'şok'],     ad: 'ŞOK',         bg: '#FFED00', text: '#1b2a6b', stil: 'kutu' },
  { anahtar: ['migros'],         ad: 'Migros',      bg: '#EA6E1F', text: '#EA6E1F', stil: 'yazi' },
  { anahtar: ['carrefour'],      ad: 'CarrefourSA', bg: '#004B93', text: '#ffffff', stil: 'kutu' },
  { anahtar: ['hakmar'],         ad: 'Hakmar',      bg: '#B4121B', text: '#ffffff', stil: 'kutu' },
  { anahtar: ['tarim', 'tarım', 'kredi'], ad: 'Tarım Kredi', bg: '#1C7C34', text: '#ffffff', stil: 'kutu' },
]

const VARSAYILAN = { ad: null, bg: '#64748b', text: '#ffffff', stil: 'kutu' }

// Verilen market adına en uygun marka kimliğini döndürür.
export function marka(marketAdi = '') {
  const s = String(marketAdi).toLocaleLowerCase('tr')
  const bulunan = MARKALAR.find((m) => m.anahtar.some((a) => s.includes(a)))
  return bulunan ? { ...bulunan } : { ...VARSAYILAN, ad: marketAdi || 'Market' }
}

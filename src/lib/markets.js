// Market marka kimliği: her zincirin kendi rengi ve kısaltması.
// marketAdi API'den geldiği gibi eşleşir (küçük harf + içerir kontrolü).

const MARKALAR = [
  { anahtar: ['bim'],            ad: 'BİM',         bg: '#E4002B', text: '#ffffff' },
  { anahtar: ['a101', 'a 101'],  ad: 'A101',        bg: '#C8102E', text: '#ffffff' },
  { anahtar: ['sok', 'şok'],     ad: 'ŞOK',         bg: '#FDC300', text: '#1a1a1a' },
  { anahtar: ['migros'],         ad: 'Migros',      bg: '#EF7D00', text: '#ffffff' },
  { anahtar: ['carrefour'],      ad: 'CarrefourSA', bg: '#004B93', text: '#ffffff' },
  { anahtar: ['hakmar'],         ad: 'Hakmar',      bg: '#B4121B', text: '#ffffff' },
  { anahtar: ['tarim', 'tarım', 'kredi'], ad: 'Tarım Kredi', bg: '#2E7D32', text: '#ffffff' },
]

const VARSAYILAN = { ad: null, bg: '#64748b', text: '#ffffff' }

// Verilen market adına en uygun marka kimliğini döndürür.
export function marka(marketAdi = '') {
  const s = String(marketAdi).toLocaleLowerCase('tr')
  const bulunan = MARKALAR.find((m) => m.anahtar.some((a) => s.includes(a)))
  return bulunan
    ? { ...bulunan, ad: bulunan.ad }
    : { ...VARSAYILAN, ad: marketAdi || 'Market' }
}

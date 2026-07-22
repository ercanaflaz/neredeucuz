// Market marka kimliği: her zincirin kendi rengi, kısaltması ve kurumsal logosu.
// marketAdi API'den geldiği gibi eşleşir (küçük harf + içerir kontrolü).

// Logo: marketin kendi alan adının favicon'u (Google favicon servisi — güvenilir,
// gerçek kurumsal marka simgesi). Kopyalayıp barındırmayız; anlık yüklenir.
export function logoUrl(alan) {
  return alan ? `https://www.google.com/s2/favicons?domain=${alan}&sz=64` : null
}

const MARKALAR = [
  { anahtar: ['bim'],            ad: 'BİM',         bg: '#E4002B', text: '#ffffff', alan: 'bim.com.tr' },
  { anahtar: ['a101', 'a 101'],  ad: 'A101',        bg: '#C8102E', text: '#ffffff', alan: 'a101.com.tr' },
  { anahtar: ['sok', 'şok'],     ad: 'ŞOK',         bg: '#FDC300', text: '#1a1a1a', alan: 'sokmarket.com.tr' },
  { anahtar: ['migros'],         ad: 'Migros',      bg: '#EF7D00', text: '#ffffff', alan: 'migros.com.tr' },
  { anahtar: ['carrefour'],      ad: 'CarrefourSA', bg: '#004B93', text: '#ffffff', alan: 'carrefoursa.com' },
  { anahtar: ['hakmar'],         ad: 'Hakmar',      bg: '#B4121B', text: '#ffffff', alan: 'hakmar.com.tr' },
  { anahtar: ['tarim', 'tarım', 'kredi'], ad: 'Tarım Kredi', bg: '#2E7D32', text: '#ffffff', alan: 'tarimkredi.com.tr' },
]

const VARSAYILAN = { ad: null, bg: '#64748b', text: '#ffffff', alan: null }

// Verilen market adına en uygun marka kimliğini döndürür (logo dahil).
export function marka(marketAdi = '') {
  const s = String(marketAdi).toLocaleLowerCase('tr')
  const bulunan = MARKALAR.find((m) => m.anahtar.some((a) => s.includes(a)))
  const t = bulunan || { ...VARSAYILAN, ad: marketAdi || 'Market' }
  return { ...t, ad: t.ad, logo: logoUrl(t.alan) }
}

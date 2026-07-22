// Market marka kimliği: her zincirin kendi rengi, tarzı ve kısaltması.
// marketAdi API'den geldiği gibi eşleşir (küçük harf + içerir kontrolü).
// stil: 'kutu' → renkli kutu + beyaz/koyu yazı · 'yazi' → sadece renkli kalın yazı (ör. Migros)

const MARKALAR = [
  // Kırmızı kutu — BİM'in resmi kırmızısı
  { anahtar: ['bim'],            ad: 'BİM',         bg: '#ED1C24', text: '#ffffff', stil: 'kutu' },
  // A101 — resmi mavi kutu, beyaz yazı
  { anahtar: ['a101', 'a 101'],  ad: 'A101',        bg: '#0B4DA2', text: '#ffffff', stil: 'kutu' },
  // ŞOK — kutusuz renkli harf-logo (Ş kırmızı, O mavi, K turuncu)
  { anahtar: ['sok', 'şok'],     ad: 'ŞOK',         bg: '#E2001A', text: '#ffffff', stil: 'renkli',
    harfRenkleri: ['#E2001A', '#0090D4', '#F39200'] },
  // Migros — turuncu kelime-logo (kutusuz)
  { anahtar: ['migros'],         ad: 'Migros',      bg: '#FF6600', text: '#FF6600', stil: 'yazi' },
  // CarrefourSA — resmi mavi
  { anahtar: ['carrefour'],      ad: 'CarrefourSA', bg: '#004E9E', text: '#ffffff', stil: 'kutu' },
  // Hakmar — kırmızı
  { anahtar: ['hakmar'],         ad: 'Hakmar',      bg: '#C8102E', text: '#ffffff', stil: 'kutu' },
  // Tarım Kredi Kooperatif Market — kurumsal yeşil
  { anahtar: ['tarim', 'tarım', 'kredi'], ad: 'Tarım Kredi', bg: '#009640', text: '#ffffff', stil: 'kutu' },
  // Diğer sık görülen zincirler
  { anahtar: ['onur'],           ad: 'Onur Market', bg: '#E30613', text: '#ffffff', stil: 'kutu' },
  { anahtar: ['file'],           ad: 'File',        bg: '#00954C', text: '#ffffff', stil: 'kutu' },
  { anahtar: ['happy'],          ad: 'Happy Center',bg: '#EC008C', text: '#ffffff', stil: 'kutu' },
  { anahtar: ['ecopet', 'eko pet'], ad: 'Ecopet',   bg: '#F58220', text: '#ffffff', stil: 'kutu' },
  { anahtar: ['pehlivan'],       ad: 'Pehlivanoğlu',bg: '#00529B', text: '#ffffff', stil: 'kutu' },
  { anahtar: ['mopaş', 'mopas'], ad: 'Mopaş',       bg: '#004A93', text: '#ffffff', stil: 'kutu' },
]

const VARSAYILAN = { ad: null, bg: '#64748b', text: '#ffffff', stil: 'kutu' }

// Verilen market adına en uygun marka kimliğini döndürür.
export function marka(marketAdi = '') {
  const s = String(marketAdi).toLocaleLowerCase('tr')
  const bulunan = MARKALAR.find((m) => m.anahtar.some((a) => s.includes(a)))
  return bulunan ? { ...bulunan } : { ...VARSAYILAN, ad: marketAdi || 'Market' }
}

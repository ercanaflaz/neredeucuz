// Yerel (AI'sız, ücretsiz, anında) öneri motoru.
// Yaygın istekleri anahtar kelimeyle eşleştirip hazır ürün listesi döndürür.
// Kalıba uymayan özel sorularda null döner → o zaman Gemini denenir.

// --- İŞLETME / HORECA setleri (restoran, kafe, pastane, büfe, otel, ofis) ---
// Toplu alım yapan işletmeler için. Ev setlerinden ÖNCE eşleşmeli:
// yerelOneri ilk uyan seti döndürür, o yüzden bunları başa koyuyoruz
// (ör. "otel kahvaltısı" → otel seti, genel "kahvaltı" setine düşmez).
const ISLETME = [
  { anahtar: ['restoran', 'lokanta', 'restaurant', 'aşevi', 'asevi', 'kebapçı', 'kebapci'], ad: 'restoran / lokanta',
    items: ['pirinç', 'bulgur', 'ayçiçek yağı', 'domates salçası', 'biber salçası', 'makarna', 'un', 'kuru fasulye', 'nohut', 'kırmızı mercimek', 'tuz', 'soğan', 'patates', 'tavuk', 'kıyma', 'peçete', 'streç film', 'çöp poşeti', 'bulaşık deterjanı', 'sıvı sabun'] },
  { anahtar: ['kafe', 'cafe', 'kahve dükkan', 'kahveci', 'çay ocağı', 'cay ocagi'], ad: 'kafe',
    items: ['türk kahvesi', 'filtre kahve', 'çay', 'süt', 'şeker', 'sıcak çikolata', 'karton bardak', 'peçete', 'kek', 'kurabiye', 'meşrubat', 'su', 'maden suyu', 'bulaşık deterjanı'] },
  { anahtar: ['pastane', 'fırın', 'firin', 'tatlıcı', 'tatlici', 'unlu mamul', 'pasta yap', 'börekçi', 'borekci'], ad: 'pastane / fırın',
    items: ['un', 'şeker', 'tereyağı', 'margarin', 'yumurta', 'süt', 'kabartma tozu', 'vanilya', 'kakao', 'pudra şekeri', 'bitkisel krema', 'ayçiçek yağı', 'yaş maya', 'tuz'] },
  { anahtar: ['büfe', 'bufe', 'kantin'], ad: 'büfe / kantin',
    items: ['meşrubat', 'su', 'maden suyu', 'cips', 'çikolata', 'gofret', 'bisküvi', 'sakız', 'ekmek', 'sosis', 'sucuk', 'kaşar peyniri', 'ketçap', 'mayonez', 'peçete', 'karton bardak'] },
  { anahtar: ['otel', 'pansiyon', 'konaklama', 'motel', 'apart'], ad: 'otel kahvaltısı',
    items: ['yumurta', 'beyaz peynir', 'kaşar peyniri', 'siyah zeytin', 'yeşil zeytin', 'bal', 'reçel', 'tereyağı', 'domates', 'salatalık', 'ekmek', 'çay', 'süt', 'meyve suyu', 'tahin', 'pekmez', 'kuruyemiş'] },
  { anahtar: ['ofis', 'işyeri', 'isyeri', 'iş yeri', 'çalışan', 'şirket mutfağı'], ad: 'ofis mutfağı',
    items: ['çay', 'türk kahvesi', 'filtre kahve', 'şeker', 'süt', 'bisküvi', 'su', 'karton bardak', 'kağıt havlu', 'çöp poşeti', 'bulaşık deterjanı', 'sıvı sabun', 'peçete'] },
]

const SETLER = [
  ...ISLETME,
  { anahtar: ['kahvaltı', 'kahvalti', 'kahvaltılık', 'kahvaltilik'], ad: 'kahvaltı',
    items: ['yumurta', 'beyaz peynir', 'zeytin', 'bal', 'tereyağı', 'domates', 'salatalık', 'ekmek', 'çay', 'reçel'] },
  { anahtar: ['temizlik', 'deterjan', 'kağıt', 'kagit', 'kağıt ürün'], ad: 'temizlik & kağıt',
    items: ['çamaşır deterjanı', 'bulaşık deterjanı', 'yumuşatıcı', 'tuvalet kağıdı', 'kağıt havlu', 'çöp poşeti', 'yüzey temizleyici', 'cam sil'] },
  { anahtar: ['bebek'], ad: 'bebek',
    items: ['bebek bezi', 'ıslak mendil', 'bebek maması', 'bebek şampuanı', 'pişik kremi', 'biberon'] },
  { anahtar: ['diyet', 'sağlık', 'saglik', 'sağlıklı', 'saglikli'], ad: 'sağlıklı beslenme',
    items: ['yulaf', 'yoğurt', 'tavuk göğsü', 'yeşil mercimek', 'zeytinyağı', 'badem', 'marul', 'yumurta'] },
  { anahtar: ['bakliyat', 'kışlık', 'kislik', 'erzak', 'kuru gıda'], ad: 'bakliyat & erzak',
    items: ['kuru fasulye', 'nohut', 'kırmızı mercimek', 'bulgur', 'pirinç', 'domates salçası', 'un', 'şeker', 'ayçiçek yağı'] },
  { anahtar: ['misafir', 'ikram', 'ikramlık', 'ikramlik'], ad: 'ikramlık',
    items: ['çay', 'türk kahvesi', 'bisküvi', 'çikolata', 'kuruyemiş', 'meşrubat', 'kek'] },
  { anahtar: ['akşam yemeği', 'aksam', 'yemek', 'akşam'], ad: 'akşam yemeği',
    items: ['makarna', 'domates salçası', 'kıyma', 'soğan', 'pirinç', 'bulgur', 'kırmızı mercimek', 'tavuk', 'patates'] },
  { anahtar: ['öğrenci', 'ogrenci', 'öğrenci evi'], ad: 'öğrenci evi',
    items: ['makarna', 'pirinç', 'bulgur', 'kırmızı mercimek', 'yumurta', 'süt', 'ekmek', 'çay', 'domates salçası', 'ton balığı'] },
  { anahtar: ['haftalık', 'haftalik', 'ekonomik'], ad: 'haftalık ekonomik',
    items: ['süt', 'ekmek', 'yumurta', 'makarna', 'pirinç', 'ayçiçek yağı', 'domates salçası', 'çay', 'çamaşır deterjanı', 'tuvalet kağıdı'] },
  { anahtar: ['aylık', 'aylik', 'market', 'alışveriş', 'alisveris'], ad: 'aylık market',
    items: ['süt', 'yumurta', 'ekmek', 'makarna', 'pirinç', 'bulgur', 'ayçiçek yağı', 'şeker', 'un', 'çay', 'domates salçası', 'çamaşır deterjanı', 'bulaşık deterjanı', 'tuvalet kağıdı', 'kağıt havlu', 'beyaz peynir', 'zeytin', 'yoğurt'] },
]

// --- Belirsiz terim çözümü + ürün ipuçları (autocomplete) ---
// "helva" yazınca → tahin helvası / kağıt helva / irmik helvası gibi net seçenekler.
const BELIRSIZ = [
  { anahtar: ['helva'], oneriler: ['tahin helvası', 'kağıt helva', 'irmik helvası'] },
  { anahtar: ['peynir'], oneriler: ['beyaz peynir', 'kaşar peyniri', 'tulum peyniri', 'lor peyniri', 'labne'] },
  { anahtar: ['yağ', 'yag'], oneriler: ['ayçiçek yağı', 'zeytinyağı', 'mısır yağı', 'tereyağı', 'sıvı yağ'] },
  { anahtar: ['süt', 'sut'], oneriler: ['tam yağlı süt', 'yarım yağlı süt', 'laktozsuz süt', 'çocuk sütü'] },
  { anahtar: ['çay', 'cay'], oneriler: ['siyah çay', 'yeşil çay', 'bitki çayı', 'poşet çay', 'demlik poşet çay'] },
  { anahtar: ['kahve'], oneriler: ['türk kahvesi', 'filtre kahve', 'granül kahve', 'hazır kahve', 'espresso'] },
  { anahtar: ['deterjan'], oneriler: ['çamaşır deterjanı', 'bulaşık deterjanı', 'toz deterjan', 'sıvı deterjan'] },
  { anahtar: ['makarna'], oneriler: ['spagetti makarna', 'burgu makarna', 'fiyonk makarna', 'kelebek makarna'] },
  { anahtar: ['pirinç', 'pirinc'], oneriler: ['baldo pirinç', 'osmancık pirinç', 'yasemin pirinç'] },
  { anahtar: ['zeytin'], oneriler: ['siyah zeytin', 'yeşil zeytin', 'sele zeytin'] },
  { anahtar: ['reçel', 'recel'], oneriler: ['vişne reçeli', 'kayısı reçeli', 'çilek reçeli'] },
  { anahtar: ['bal'], oneriler: ['çiçek balı', 'çam balı', 'süzme bal'] },
  { anahtar: ['salça', 'salca'], oneriler: ['domates salçası', 'biber salçası'] },
  { anahtar: ['un'], oneriler: ['buğday unu', 'tam buğday unu', 'mısır unu'] },
  { anahtar: ['bez', 'bebek bez'], oneriler: ['bebek bezi', 'külot bez', 'ıslak mendil'] },
  { anahtar: ['şampuan', 'sampuan'], oneriler: ['saç şampuanı', 'bebek şampuanı', 'kepek şampuanı'] },
  { anahtar: ['kağıt', 'kagit'], oneriler: ['tuvalet kağıdı', 'kağıt havlu', 'peçete', 'kağıt mendil'] },
]

// Genel ürün sözlüğü — parça yazınca tamamlama önerir.
const URUNLER = [
  'süt', 'yumurta', 'ekmek', 'peynir', 'beyaz peynir', 'kaşar peyniri', 'yoğurt', 'ayran', 'tereyağı',
  'zeytin', 'bal', 'reçel', 'tahin', 'pekmez', 'zeytinyağı', 'ayçiçek yağı', 'mısır yağı',
  'makarna', 'pirinç', 'bulgur', 'un', 'şeker', 'tuz', 'salça', 'domates salçası', 'sirke',
  'çay', 'türk kahvesi', 'filtre kahve', 'kuru fasulye', 'nohut', 'mercimek', 'kırmızı mercimek',
  'çamaşır deterjanı', 'bulaşık deterjanı', 'yumuşatıcı', 'tuvalet kağıdı', 'kağıt havlu', 'çöp poşeti',
  'bebek bezi', 'ıslak mendil', 'bebek maması', 'bebek şampuanı', 'diş macunu', 'sabun', 'şampuan',
  'domates', 'salatalık', 'patates', 'soğan', 'limon', 'elma', 'muz', 'portakal',
  'tavuk', 'kıyma', 'ton balığı', 'sucuk', 'sosis', 'salam', 'yulaf', 'bisküvi', 'çikolata',
  'meşrubat', 'su', 'maden suyu', 'kek', 'gofret', 'cips', 'kuruyemiş', 'helva',
]

// Yazılan parçaya göre net ürün önerileri (belirsizleri açar + tamamlar).
export function urunOnerileri(metin, limit = 6) {
  const s = String(metin || '').toLocaleLowerCase('tr').trim()
  if (s.length < 2) return []
  const bulunan = []
  const ekle = (t) => { if (t && !bulunan.some((x) => x.toLocaleLowerCase('tr') === t.toLocaleLowerCase('tr'))) bulunan.push(t) }
  // 1) belirsiz terim → net varyantlar
  for (const g of BELIRSIZ) if (g.anahtar.some((a) => s.includes(a))) g.oneriler.forEach(ekle)
  // 2) sözlükte içeren ürünler
  for (const u of URUNLER) { if (u.toLocaleLowerCase('tr').includes(s)) ekle(u); if (bulunan.length >= limit + 4) break }
  // yazılanla birebir aynıysa öneri gösterme
  const net = bulunan.filter((x) => x.toLocaleLowerCase('tr') !== s)
  return net.slice(0, limit)
}

// --- Birim tespiti: kilolu (kg), sıvı (lt) ya da adet ---
const KILOLU = [
  // manav
  'domates', 'salatalık', 'hıyar', 'patates', 'soğan', 'sarımsak', 'biber', 'patlıcan', 'kabak', 'havuç',
  'maydanoz', 'marul', 'ıspanak', 'roka', 'dereotu', 'nane', 'pırasa', 'lahana', 'karnabahar', 'brokoli', 'fasulye',
  'elma', 'armut', 'muz', 'portakal', 'mandalina', 'limon', 'üzüm', 'çilek', 'karpuz', 'kavun', 'şeftali', 'kayısı',
  'erik', 'kiraz', 'nar', 'incir', 'ayva', 'nektarin', 'avokado',
  // et & şarküteri
  'kıyma', 'tavuk', 'et ', 'dana', 'kuzu', 'balık', 'köfte', 'but', 'kanat', 'bonfile', 'pirzola', 'kuşbaşı',
  // tartılan diğerleri
  'peynir', 'kaşar', 'zeytin', 'kuruyemiş', 'fındık', 'fıstık', 'ceviz', 'badem', 'leblebi', 'kuru kayısı',
  'kuru üzüm', 'hurma', 'lokum', 'helva', 'tahin', 'pastırma', 'sucuk', 'salam', 'jambon', 'reyon',
]
const SIVI = [
  'ayçiçek yağı', 'zeytinyağı', 'zeytin yağı', 'mısır yağı', 'sıvı yağ', 'fındık yağı', 'kanola yağı',
  'sıvı sabun', 'sıvı deterjan', 'çamaşır suyu', 'yumuşatıcı',
]
// Tartılan tahıl / bakliyat / kuru gıda → kg
const TAHIL = [
  'pirinç', 'bulgur', 'mercimek', 'nohut', 'un', 'şeker', 'irmik', 'yarma', 'buğday',
  'kuru fasulye', 'barbunya', 'börülce', 'nişasta',
]
// Paketli / çoklu sayılan ürünler → "paket" (yanında kaçlı seçilir)
const PAKET = [
  'yumurta', 'tuvalet kağıdı', 'kağıt havlu', 'peçete', 'ıslak mendil', 'ıslak havlu',
  'çöp poşeti', 'çöp torbası', 'buzdolabı poşeti', 'kilitli poşet',
]
// Kavanoz / kutu ürün → adet (kg değil)
const KAVANOZ = ['salça', 'turşu', 'reçel', 'pekmez', 'ketçap', 'mayonez', 'hardal', 'konserve', 'bal', 'sos']

// Paketli ürün için "kaçlı" seçenekleri
const PAKET_SECENEK = {
  'yumurta': ["10'lu", "15'li", "30'lu"],
  'tuvalet kağıdı': ["8'li", "16'lı", "24'lü", "32'li", "4'lü", "12'li"],
  'kağıt havlu': ["4'lü", "2'li", "6'lı", "8'li", "12'li"],
  'peçete': ["tekli", "2'li"],
  'ıslak mendil': ["tekli", "2'li", "4'lü"],
  'çöp poşeti': ["tekli", "2'li", "3'lü"],
}
const PAKET_VARSAYILAN = ["tekli", "2'li", "4'lü", "6'lı"]

// Kelime başına eşleşme — "et " içindeki "tuvalet", "bal" içindeki "balık" gibi
// yanlış eşleşmeleri önler. Kısa (≤3 harf) anahtarlar yalnız TAM kelimeyle eşleşir.
function eslesir(terim, anahtarlar) {
  const s = String(terim || '').toLocaleLowerCase('tr').trim()
  const kelimeler = s.split(/\s+/)
  return anahtarlar.some((k) => {
    const kk = k.trim()
    if (kk.includes(' ')) return s.includes(kk)
    return kelimeler.some((w) => (kk.length >= 4 ? (w === kk || w.startsWith(kk)) : w === kk))
  })
}

// Not: sade "yağ" çoğunlukla sıvıdır → lt. "tereyağı"/"kremayağı" hariç.
export function birimTespit(terim) {
  const s = String(terim || '').toLocaleLowerCase('tr')
  if (eslesir(s, PAKET)) return 'paket'
  if (eslesir(s, SIVI)) return 'lt'
  if (s.includes('yağ') && !s.includes('tereyağ') && !s.includes('kremayağ')) return 'lt'
  if (eslesir(s, KAVANOZ)) return 'adet'
  if (eslesir(s, KILOLU) || eslesir(s, TAHIL)) return 'kg'
  return 'adet'
}
export function kiloluMu(terim) {
  return birimTespit(terim) === 'kg'
}
// Paketli ürünün "kaçlı" seçenekleri (ör. yumurta → 10'lu/15'li/30'lu)
export function paketSecenekleri(terim) {
  const s = String(terim || '').toLocaleLowerCase('tr')
  for (const k of Object.keys(PAKET_SECENEK)) {
    if (eslesir(s, [k])) return PAKET_SECENEK[k]
  }
  return PAKET_VARSAYILAN
}

// --- Tamamlayıcı öneriler: kutu boşken "bunlar da lazım olabilir" ---
const EKSTRA_HAVUZ = [
  'peçete', 'çöp poşeti', 'kağıt havlu', 'ıslak mendil', 'bulaşık süngeri', 'alüminyum folyo', 'streç film',
  'sıvı sabun', 'diş macunu', 'deodorant', 'şampuan', 'çamaşır suyu', 'yumuşatıcı', 'oda spreyi',
  'kalem pil', 'buzdolabı poşeti', 'kilitli poşet', 'ıslak kağıt havlu', 'cam sil', 'yüzey temizleyici',
  'ketçap', 'mayonez', 'sıvı yağ', 'karbonat', 'kabartma tozu', 'vanilya', 'maden suyu', 'kuru üzüm',
]
export function ekstraOneriler(mevcut = [], limit = 8) {
  const set = new Set((mevcut || []).map((t) => String(t).toLocaleLowerCase('tr')))
  return EKSTRA_HAVUZ.filter((x) => !set.has(x.toLocaleLowerCase('tr'))).slice(0, limit)
}

export function yerelOneri(metin) {
  const s = String(metin || '').toLocaleLowerCase('tr')
  if (!s.trim()) return null
  const set = SETLER.find((x) => x.anahtar.some((a) => s.includes(a)))
  if (!set) return null
  return {
    ad: set.ad,
    reply: `İşte "${set.ad}" için önerdiğim ürünler — beğenmediğini çıkarabilirsin:`,
    items: set.items.map((t) => ({ terim: t, adet: 1, marka: null })),
    yerel: true,
  }
}

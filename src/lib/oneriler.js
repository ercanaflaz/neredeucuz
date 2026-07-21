// Yerel (AI'sız, ücretsiz, anında) öneri motoru.
// Yaygın istekleri anahtar kelimeyle eşleştirip hazır ürün listesi döndürür.
// Kalıba uymayan özel sorularda null döner → o zaman Gemini denenir.

const SETLER = [
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
// Not: sade "yağ" çoğunlukla sıvıdır → lt. "tereyağı"/"kremayağı" hariç.
export function birimTespit(terim) {
  const s = ' ' + String(terim || '').toLocaleLowerCase('tr') + ' '
  if (SIVI.some((k) => s.includes(k))) return 'lt'
  if (s.includes('yağ') && !s.includes('tereyağ') && !s.includes('kremayağ')) return 'lt'
  if (KILOLU.some((k) => s.includes(k))) return 'kg'
  return 'adet'
}
export function kiloluMu(terim) {
  return birimTespit(terim) === 'kg'
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

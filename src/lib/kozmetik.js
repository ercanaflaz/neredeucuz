import { supabase } from './supabase'

// ——— Eşleştirme anahtarı (SIKILAŞTIRILMIŞ) ———
// marka + ürün adındaki anlamlı kelimeler. Sayılar KORUNUR (renk no / boy) ki
// "Pastel Oje 405" ≠ "Pastel Oje 393" olsun (yanlış eşleşme azalır).
const ES_STOP = new Set(['ve', 'ile', 'için', 'icin', 'yeni', 'set', 'paket', 'adet', 'ml', 'lt', 'l', 'gr', 'g', 'kg', 'cl', 'x', 'li', 'lu', 'lı', 'no', 'kadın', 'kadin', 'erkek', 'bayan', 'ea', 'the'])
// Türkçe harfleri ASCII'ye katlar. KRİTİK: Eve markaları BÜYÜK HARF ("MAYBELLINE")
// saklıyor; toLocaleLowerCase('tr') I→ı çevirince "maybellıne" olur ve Gratis'in
// "maybelline"i ile eşleşmez. Bu yüzden önce ASCII'ye katlayıp sonra küçültüyoruz.
const TR_KATLA = { ı: 'i', İ: 'i', i̇: 'i', ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u', â: 'a', î: 'i', û: 'u' }
const norm = (v) => (v || '').replace(/[ıİi̇çÇğĞöÖşŞüÜâîû]/g, (c) => TR_KATLA[c] || c).toLowerCase().replace(/[^0-9a-z ]/gi, ' ').replace(/\s+/g, ' ').trim()
function anahtarUret(marka, ad) {
  const m = norm(marka)
  const markaTok = new Set(m.split(' ').filter(Boolean))
  let t = norm(ad).split(' ').filter((x) => x.length > 1 && !ES_STOP.has(x) && !markaTok.has(x))
  t = [...new Set(t)].sort()
  const k = (m + ' ' + t.join(' ')).trim()
  return k || null
}

// ——— Temiz kategori (9 standart) ———
// Ham kategori + ürün adına bakıp tek tip bir kategoriye yerleştirir.
export const STANDART_KATEGORILER = ['Makyaj', 'Cilt Bakımı', 'Saç Bakım', 'Parfüm & Deodorant', 'Ağız & Diş', 'Duş & Vücut', 'Tıraş', 'Bebek & Mendil', 'Kağıt & Ped']
function kategoriBul(ad, ham) {
  const s = `${ham || ''} ${ad || ''}`.toLocaleLowerCase('tr')
  const v = (...ks) => ks.some((k) => s.includes(k))
  if (v('maskara', 'rimel', 'ruj', 'likit ruj', ' far', 'far paleti', 'fondöten', 'fondoten', 'kapatıcı', 'kapatici', 'allık', 'allik', 'pudra', ' oje', 'eyeliner', 'göz kalemi', 'goz kalemi', 'kaş kalem', 'kas kalem', 'highlighter', 'bronzer', 'aydınlatıcı', 'makyaj')) return 'Makyaj'
  if (v('şampuan', 'sampuan', 'saç', 'sac ', 'jöle', 'jole', 'wax', 'saç boya', 'durulanmayan')) return 'Saç Bakım'
  if (v('parfüm', 'parfum', 'deodorant', 'deo sprey', 'kolonya', ' edt', ' edp', 'body mist', 'roll on', 'roll-on')) return 'Parfüm & Deodorant'
  if (v('diş macun', 'dis macun', 'diş fırça', 'dis firca', 'ağız', 'agiz', 'gargar')) return 'Ağız & Diş'
  if (v('tıraş', 'tiras', 'jilet', 'after shave')) return 'Tıraş'
  if (v('bebek', 'biberon', 'mama', 'emzik', 'ıslak mendil', 'islak mendil')) return 'Bebek & Mendil'
  if (v('tuvalet kağıd', 'tuvalet kagid', 'kağıt havlu', 'kagit havlu', 'peçete', 'pecete', ' ped', 'hijyenik ped', 'günlük ped')) return 'Kağıt & Ped'
  if (v('duş jel', 'dus jel', 'sabun', 'banyo', 'vücut', 'vucut', 'el kremi', 'losyon', 'ayak')) return 'Duş & Vücut'
  if (v('cilt', 'krem', 'nemlendiric', 'serum', 'tonik', 'peeling', 'maske', 'güneş', 'gunes', 'temizle', 'micellar', 'yüz', 'yuz', 'göz krem', 'goz krem', 'spf')) return 'Cilt Bakımı'
  return 'Cilt Bakımı' // varsayılan
}

// Tüm satırları sayfa sayfa çeker (Supabase istek başına 1000 sınırı).
async function tumSatirlar() {
  const hepsi = []
  for (let off = 0; off < 20000; off += 1000) {
    const { data, error } = await supabase.from('kozmetik_urunler').select('*').order('id', { ascending: true }).range(off, off + 999)
    if (error) { console.warn('kozmetik yükleme hatası:', error.message); break }
    if (!data || !data.length) break
    hepsi.push(...data)
    if (data.length < 1000) break
  }
  return hepsi
}

// Bir mağaza satırının seçilen moda göre "etkin" (geçerli) fiyatı.
// kartMod=true → kart fiyatı varsa onu, yoksa herkese açık fiyatı kullan.
// kartMod=false → her zaman herkese açık fiyat.
export function etkinFiyat(m, kartMod = true) {
  if (kartMod && m.kart_fiyat != null && m.kart_fiyat > 0 && m.kart_fiyat < m.fiyat) return m.kart_fiyat
  return m.fiyat
}

// Bir grubu (aynı ürünün mağazaları) seçilen moda göre fiyatlandırır ve sıralar.
// Döner: { sirali:[{...m, etkin, kartIle}], enUcuz, enPahali, tasarruf }
export function grupFiyat(g, kartMod = true) {
  const sirali = g.magazalar
    .map((m) => {
      const kartIle = kartMod && m.kart_fiyat != null && m.kart_fiyat > 0 && m.kart_fiyat < m.fiyat
      return { ...m, etkin: kartIle ? m.kart_fiyat : m.fiyat, kartIle }
    })
    .sort((a, b) => a.etkin - b.etkin)
  const enUcuz = sirali[0]
  const enPahali = sirali[sirali.length - 1]
  const tasarruf = sirali.length > 1 ? Math.round((enPahali.etkin - enUcuz.etkin) * 100) / 100 : 0
  return { sirali, enUcuz, enPahali, tasarruf }
}

// Tüm ürünleri çekip mağazalar arası eşleştirir. Her grup temiz bir kategoriye atanır.
export async function kozmetikTumGruplar() {
  const satirlar = await tumSatirlar()
  const gruplar = new Map()
  for (const r of satirlar) {
    const key = anahtarUret(r.marka, r.ad) || `tek-${r.id}`
    if (!gruplar.has(key)) gruplar.set(key, [])
    gruplar.get(key).push(r)
  }

  // Kart varsa kart, yoksa açık fiyat — grubu kurarken varsayılan (kart modu) baz alınır.
  const eff = (s) => (s.kart_fiyat != null && s.kart_fiyat > 0 && s.kart_fiyat < s.fiyat ? s.kart_fiyat : s.fiyat)

  const sonuc = []
  for (const grup of gruplar.values()) {
    const magazaMap = new Map()
    for (const s of grup) {
      if (s.fiyat == null) continue
      const ex = magazaMap.get(s.magaza)
      if (!ex || eff(s) < eff(ex)) magazaMap.set(s.magaza, s)
    }
    const secilenler = [...magazaMap.values()]
    if (!secilenler.length) continue
    const magazalar = secilenler
      .map((s) => ({ magaza: s.magaza, fiyat: s.fiyat, kart_fiyat: s.kart_fiyat ?? null, stok: s.stok, url: s.url }))
      .sort((a, b) => eff(a) - eff(b))
    const ucuzRow = secilenler.slice().sort((a, b) => eff(a) - eff(b))[0]
    const ornek = grup.find((s) => s.gorsel) || ucuzRow
    sonuc.push({
      anahtar: `${ucuzRow.magaza}-${ucuzRow.id}`,
      ad: ornek.ad,
      marka: ornek.marka,
      gorsel: ornek.gorsel,
      kategori: kategoriBul(ornek.ad, ornek.kategori),
      magazalar,
      magazaSayisi: magazalar.length,
      _sira: eff(ucuzRow),
    })
  }
  sonuc.sort((a, b) => (b.magazaSayisi - a.magazaSayisi) || (a._sira - b._sira))
  return sonuc
}

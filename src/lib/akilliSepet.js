// Akıllı Sepet: kullanıcının kayıtlı düzenli listesi + tercih hafızası.
// "Sepetimi oluştur" deyince her kalem için güncel en ucuz ürünü seçer.
import { supabase } from './supabase'
import { getAuth } from './auth'
import { searchByKeyword, normalize } from './marketfiyati'
import { sepetHesapla } from './sepet'
import { birimTespit, paketSecenekleri } from './oneriler'
import { izle } from './izleme'

// Paketli ürün için varsayılan "kaçlı" (ör. yumurta → 10'lu). Paket değilse null.
function ilkPaketBoyu(terim) {
  if (birimTespit(terim) !== 'paket') return null
  const o = paketSecenekleri(terim)
  return o && o.length ? o[0] : null
}

const LS = 'neredeucuz_akilli_liste'
const LS_LISTELER = 'neredeucuz_listelerim'

function lsGetK(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def } }
function lsSetK(key, v) { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* yoksay */ } }
function lsGet(def) { return lsGetK(LS, def) }
function lsSet(v) { lsSetK(LS, v) }

let cache = {
  liste: lsGet([]), // aktif liste [{ id, terim, adet, tercihMarka, istenmeyenMarkalar:[], istenmeyenUrunler:[] }]
  listelerim: lsGetK(LS_LISTELER, []), // [{ id, ad, urunler:[...] }]
  aktifListeId: null, // aktif listenin geldiği kayıtlı liste id'si (varsa)
  mod: 'ucuz',      // seçim modu: 'ucuz' | 'avantajli'
  sonuc: null,      // { kalemler:[...], hesap:{...}, bulunamayan:[terim], mod }
  olusturuluyor: false,
  yukleniyor: false,
}
const listeners = new Set()
const emit = () => { cache = { ...cache }; listeners.forEach((l) => l()) }
export function subscribe(l) { listeners.add(l); return () => listeners.delete(l) }
export function getSnapshot() { return cache }

const uid = () => getAuth().user?.id || null
const yeniId = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))
// Terimi Türkçe-doğru küçük harfe indir + boşlukları sadeleştir (SALA → sala, İ→i, I→ı).
const duzenleTerim = (t) => String(t || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr')

// İstenen miktar + ürün paket boyutundan KAÇ PAKET alınacağını bul.
// Ölçülü (kg/lt): istenen 5 lt, ürün 5 lt'lik → 1 paket. istenen 5 lt, ürün 1 lt'lik → 5 paket.
// Adet ürün: istenen sayısı = paket sayısı.
function paketAdediHesapla(istenen, birim, urun) {
  const n = Number(istenen) || 1
  const olcumlu = birim === 'kg' || birim === 'lt'
  if (olcumlu && urun && urun.paketMiktar > 0 && urun.birimAdi === birim) {
    return Math.max(1, Math.round(n / urun.paketMiktar))
  }
  return Math.max(1, Math.round(n))
}

// ---- Kalıcılık (localStorage-öncelikli, Supabase opsiyonel) ----
export async function listeYukle(userId) {
  cache.liste = lsGet([]); emit()
  if (!userId) return
  try {
    const { data, error } = await supabase.from('akilli_liste').select('urunler').eq('kullanici_id', userId).maybeSingle()
    if (!error && data?.urunler?.length) { cache.liste = data.urunler; lsSet(cache.liste); emit() }
  } catch { /* tablo yok/hata — yerel kalır */ }
}

async function kaydet() {
  lsSet(cache.liste)
  kayitliListeSenkron() // aktif liste bir kayıtlı listeden geldiyse onu da güncelle
  const u = uid()
  if (!u) return
  try {
    await supabase.from('akilli_liste').upsert(
      { kullanici_id: u, urunler: cache.liste, guncelleme: new Date().toISOString() },
      { onConflict: 'kullanici_id' }
    )
  } catch { /* yoksay */ }
}

// Aktif liste bir kayıtlı listeden (Listelerim) geldiyse, düzenlemeleri o kayda da yansıt.
function kayitliListeSenkron() {
  const id = cache.aktifListeId
  if (!id) return
  const idx = cache.listelerim.findIndex((x) => x.id === id)
  if (idx < 0) return
  const urunler = JSON.parse(JSON.stringify(cache.liste))
  cache.listelerim = cache.listelerim.map((x, i) => (i === idx ? { ...x, urunler } : x))
  lsSetK(LS_LISTELER, cache.listelerim)
  const u = uid()
  if (u) { try { supabase.from('kayitli_listeler').update({ urunler }).eq('id', id).then(() => {}, () => {}) } catch { /* yoksay */ } }
}

// ---- Listelerim (adlandırılmış kayıtlı listeler) ----
export async function listeleriYukle(userId) {
  cache.listelerim = lsGetK(LS_LISTELER, []); emit()
  if (!userId) return
  try {
    const { data, error } = await supabase.from('kayitli_listeler').select('*').eq('kullanici_id', userId).order('olusturuldu', { ascending: false })
    if (!error && Array.isArray(data) && data.length) {
      cache.listelerim = data.map((r) => ({ id: r.id, ad: r.ad, urunler: r.urunler || [] }))
      lsSetK(LS_LISTELER, cache.listelerim); emit()
    }
  } catch { /* yerel kalır */ }
}

// Aktif listeyi bir adla kaydet
export async function listeKaydet(ad) {
  const isim = String(ad || '').trim() || `Liste ${cache.listelerim.length + 1}`
  if (!cache.liste.length) throw new Error('Kaydedilecek liste boş.')
  const kayit = { id: yeniId(), ad: isim, urunler: JSON.parse(JSON.stringify(cache.liste)) }
  cache.listelerim = [kayit, ...cache.listelerim]
  lsSetK(LS_LISTELER, cache.listelerim); emit()
  const u = uid()
  if (u) { try { await supabase.from('kayitli_listeler').insert({ id: kayit.id, kullanici_id: u, ad: kayit.ad, urunler: kayit.urunler }) } catch { /* yoksay */ } }
  return kayit
}

// Öneri ürünlerinden doğrudan YENİ adlandırılmış liste oluştur + aktif yap.
// (Ana sayfada "listeye ekle" → yeni liste oluşup Sepet'e gidilir.)
export async function yeniListeOlustur(ad, kalemler) {
  const yeni = (kalemler || [])
    .map((k) => {
      const terim = duzenleTerim(k.terim)
      return {
        id: yeniId(),
        terim,
        adet: k.adet || 1,
        birim: birimTespit(terim),
        paketBoyu: ilkPaketBoyu(terim),
        tercihMarka: k.marka || null,
        istenmeyenMarkalar: [],
        istenmeyenUrunler: [],
      }
    })
    .filter((x) => x.terim)
  cache.liste = yeni
  cache.sonuc = null
  lsSet(cache.liste)
  kaydet()
  const kayit = await listeKaydet(ad) // listelerim'e kaydeder + emit eder
  cache.aktifListeId = kayit.id; emit()
  return kayit
}

// Doğrudan yeni adlandırılmış kayıtlı liste oluştur (aktif listeye DOKUNMADAN).
export async function kayitliListeOlustur(ad, kalemler) {
  const isim = String(ad || '').trim() || `Liste ${cache.listelerim.length + 1}`
  const urunler = (kalemler || [])
    .map((k) => {
      const terim = duzenleTerim(k.terim)
      return { id: yeniId(), terim, adet: k.adet || 1, birim: birimTespit(terim), paketBoyu: ilkPaketBoyu(terim), tercihMarka: k.marka || null, istenmeyenMarkalar: [], istenmeyenUrunler: [] }
    })
    .filter((x) => x.terim)
  const kayit = { id: yeniId(), ad: isim, urunler }
  cache.listelerim = [kayit, ...cache.listelerim]
  lsSetK(LS_LISTELER, cache.listelerim); emit()
  try { izle('liste', { baslik: kayit.ad, detay: { urun: urunler.length } }) } catch { /* yok */ }
  const u = uid()
  if (u) { try { await supabase.from('kayitli_listeler').insert({ id: kayit.id, kullanici_id: u, ad: kayit.ad, urunler: kayit.urunler }) } catch { /* yoksay */ } }
  return kayit
}

// Var olan bir kayıtlı listeye ürün ekle.
export async function kayitliListeyeEkle(listeId, kalem) {
  const l = cache.listelerim.find((x) => x.id === listeId)
  if (!l) return
  const t = duzenleTerim(kalem.terim)
  if (!t) return
  const urunler = JSON.parse(JSON.stringify(l.urunler || []))
  const mevcut = urunler.find((x) => x.terim.toLocaleLowerCase('tr') === t)
  if (mevcut) mevcut.adet = (mevcut.adet || 1) + (kalem.adet || 1)
  else urunler.push({ id: yeniId(), terim: t, adet: kalem.adet || 1, birim: birimTespit(t), paketBoyu: ilkPaketBoyu(t), tercihMarka: kalem.marka || null, istenmeyenMarkalar: [], istenmeyenUrunler: [] })
  cache.listelerim = cache.listelerim.map((x) => (x.id === listeId ? { ...x, urunler } : x))
  lsSetK(LS_LISTELER, cache.listelerim)
  // Bu liste şu an aktifse aktif listeyi de güncelle
  if (cache.aktifListeId === listeId) { cache.liste = JSON.parse(JSON.stringify(urunler)); lsSet(cache.liste) }
  emit()
  const u = uid()
  if (u) { try { await supabase.from('kayitli_listeler').update({ urunler }).eq('id', listeId) } catch { /* yoksay */ } }
}

// Kayıtlı listeyi aktif listeye yükle
export function listeAc(id) {
  const l = cache.listelerim.find((x) => x.id === id)
  if (!l) return
  cache.liste = JSON.parse(JSON.stringify(l.urunler || []))
  cache.aktifListeId = id
  cache.sonuc = null
  lsSet(cache.liste); emit()
}

export async function listeSilId(id) {
  cache.listelerim = cache.listelerim.filter((x) => x.id !== id)
  lsSetK(LS_LISTELER, cache.listelerim)
  // Aşağıdaki aktif liste bu kayıttan geldiyse onu da temizle.
  if (cache.aktifListeId === id) {
    cache.liste = []
    cache.aktifListeId = null
    cache.sonuc = null
    lsSet(cache.liste)
  }
  emit()
  if (uid()) { try { await supabase.from('kayitli_listeler').delete().eq('id', id) } catch { /* yoksay */ } }
}

// ---- Liste düzenleme ----
export function urunEkle(terim, adet) {
  const t = duzenleTerim(terim)
  if (!t) return
  const birim = birimTespit(t)
  const kg = birim !== 'adet'
  const mevcut = cache.liste.find((x) => x.terim.toLocaleLowerCase('tr') === t)
  if (mevcut) mevcut.adet += (kg ? 0.5 : 1)
  else cache.liste.push({ id: yeniId(), terim: t, adet: adet != null ? adet : 1, birim, paketBoyu: ilkPaketBoyu(t), tercihMarka: null, istenmeyenMarkalar: [], istenmeyenUrunler: [] })
  kaydet(); emit()
}

// Toplu ekleme (serbest yazı / Gemini sonucu) — mevcut listeye EKLER
export function topluEkle(kalemler) {
  kalemler.forEach((k) => {
    const t = duzenleTerim(k.terim)
    if (!t) return
    const mevcut = cache.liste.find((x) => x.terim.toLocaleLowerCase('tr') === t)
    if (mevcut) mevcut.adet = Math.max(mevcut.adet, k.adet || 1)
    else cache.liste.push({ id: yeniId(), terim: t, adet: k.adet || 1, birim: birimTespit(t), paketBoyu: ilkPaketBoyu(t), tercihMarka: k.marka || null, istenmeyenMarkalar: [], istenmeyenUrunler: [] })
  })
  kaydet(); emit()
}

// Yeni öneri/liste oluşturma — mevcut listeyi SIFIRDAN YENİLER (üstüne eklemez)
export function topluDegistir(kalemler) {
  cache.liste = []
  topluEkle(kalemler)
}

// Bir kalemin birimini değiştir (adet ↔ kg ↔ lt).
export function birimDegistir(id, birim) {
  const it = cache.liste.find((x) => x.id === id); if (!it) return
  it.birim = birim
  // Pakete geçince varsayılan "kaçlı" gelsin; paketten çıkınca temizlensin.
  if (birim === 'paket') { if (!it.paketBoyu) { const o = paketSecenekleri(it.terim); it.paketBoyu = (o && o[0]) || null } }
  else it.paketBoyu = null
  kaydet(); emit()
}

// Paketli ürünün "kaçlı" değerini ayarla (ör. yumurta → 30'lu)
export function paketBoyuAyarla(id, boyu) {
  const it = cache.liste.find((x) => x.id === id); if (!it) return
  it.paketBoyu = boyu || null; kaydet(); emit()
}

export function urunSil(id) { cache.liste = cache.liste.filter((x) => x.id !== id); kaydet(); emit() }
export function adetDegistir(id, adet) {
  const it = cache.liste.find((x) => x.id === id); if (!it) return
  if (adet <= 0) return urunSil(id)
  it.adet = adet; kaydet(); emit()
}
export function tercihMarkaAyarla(id, m) {
  const it = cache.liste.find((x) => x.id === id); if (!it) return
  it.tercihMarka = m || null; kaydet(); emit()
}

// Bir kalemde "bu markayı bir daha getirme" (hafıza). markaAdi = ürün markası (ör. Sütaş).
export function markaIstenmez(listeId, markaAdi) {
  const it = cache.liste.find((x) => x.id === listeId); if (!it) return
  const ad = String(markaAdi || '').trim().toLocaleLowerCase('tr')
  if (ad && !it.istenmeyenMarkalar.includes(ad)) it.istenmeyenMarkalar.push(ad)
  kaydet(); emit()
}
// Belirli ürünü bir daha getirme
export function urunIstenmez(listeId, urunId) {
  const it = cache.liste.find((x) => x.id === listeId); if (!it) return
  if (!it.istenmeyenUrunler.includes(urunId)) it.istenmeyenUrunler.push(urunId)
  kaydet(); emit()
}

// ---- Sepeti oluştur: her kalem için uygun ürünü seç ----
// mod: 'ucuz' → en ucuz paket (toplam fiyat) | 'avantajli' → birim fiyatı en iyi (₺/kg, ₺/lt, ₺/adet)
export async function sepetiOlustur(konum, mod) {
  const secim = mod || cache.mod || 'ucuz'
  cache.mod = secim
  cache.olusturuluyor = true; cache.sonuc = null; emit()
  const kalemler = []
  const bulunamayan = []

  for (const item of cache.liste) {
    let secilen = null
    let avantajli = null
    try {
      const res = await searchByKeyword(item.terim, konum)
      let urunler = normalize(res, konum)
      // istenmeyen ürün + marka filtresi (marka = ürün markası, ör. sütaş)
      const banliMarkalar = (item.istenmeyenMarkalar || []).map((x) => String(x).toLocaleLowerCase('tr'))
      urunler = urunler.filter((u) => {
        const b = (u.brand || '').toLocaleLowerCase('tr')
        return !item.istenmeyenUrunler.includes(u.id) && !(b && banliMarkalar.includes(b))
      })
      // tercih markası varsa önce onu dene
      if (item.tercihMarka) {
        const t = item.tercihMarka.toLocaleLowerCase('tr')
        const tercihli = urunler.filter((u) => (u.brand || '').toLocaleLowerCase('tr').includes(t))
        if (tercihli.length) urunler = tercihli
      }
      urunler = urunler.filter((u) => u.minPrice != null)
      const bf = (u) => (u.birimFiyat ?? u.minPrice * 1e6) // birim fiyat yoksa en sona at
      const olcumlu = item.birim === 'kg' || item.birim === 'lt' // tartılan/ölçülen ürün

      if (secim === 'avantajli') {
        // Tümünde: birim fiyatı en iyi.
        urunler.sort((a, b) => bf(a) - bf(b))
        secilen = urunler[0] || null
      } else if (olcumlu) {
        // Ölçülü ürün (süt, yağ, peynir...): en ucuz KÜÇÜK paket değil,
        // istenen miktara uygun boyutta ve litre/kilo fiyatı en iyi olan seçilir.
        const hedef = Number(item.adet) || 1
        const ayni = urunler.filter((u) => u.birimAdi === item.birim && u.paketMiktar != null)
        // Paket boyutu hedefe yakın olanlar (yarısı ile 2.5 katı arası); yoksa geniş havuz.
        const yakin = ayni.filter((u) => u.paketMiktar >= hedef * 0.5 && u.paketMiktar <= hedef * 2.5)
        const kaynak = yakin.length ? yakin : (ayni.length ? ayni : urunler)
        kaynak.sort((a, b) => bf(a) - bf(b))
        secilen = kaynak[0] || null
      } else {
        // Adet ürün: en ucuz paket.
        urunler.sort((a, b) => a.minPrice - b.minPrice)
        secilen = urunler[0] || null
      }

      // "ucuz" modda: birim fiyatı belirgin daha iyi bir alternatif varsa öner (ör. 5'li paket 2'liden hesaplı).
      // Aynı baz birim (kg/lt/adet), en az %10 daha iyi birim fiyat, paket fiyatı da makul (≤5 katı).
      if (secilen && secim !== 'avantajli' && secilen.birimFiyat != null) {
        const secBF = secilen.birimFiyat
        const aday = urunler
          .filter((u) => u.id !== secilen.id && u.birimFiyat != null &&
            u.birimAdi === secilen.birimAdi &&
            u.birimFiyat < secBF * 0.9 &&
            (u.minPrice == null || u.minPrice <= secilen.minPrice * 5))
          .sort((a, b) => a.birimFiyat - b.birimFiyat)[0]
        if (aday) avantajli = aday
      }
    } catch { /* aramada hata */ }

    if (secilen) {
      const paket = paketAdediHesapla(item.adet, item.birim, secilen)
      kalemler.push({ listeId: item.id, terim: item.terim, istenen: Number(item.adet) || 1, adet: paket, birim: item.birim, urun: secilen, avantajli })
    } else bulunamayan.push(item.terim)
  }

  // sepetHesapla için uygun forma çevir
  const hesapItems = kalemler.map((k) => ({
    id: k.urun.id, urun_id: k.urun.id, baslik: k.urun.title, adet: k.adet, depots: k.urun.depots,
  }))
  const hesap = sepetHesapla(hesapItems)

  cache.sonuc = { kalemler, hesap, bulunamayan, mod: secim }
  cache.olusturuluyor = false; emit()
  return cache.sonuc
}

// Sonuçta bir kalemin ürününü (ör. avantajlı alternatifle) değiştir + toplamı yeniden hesapla.
export function kalemDegistir(listeId, yeniUrun) {
  if (!cache.sonuc || !yeniUrun) return
  const kalemler = cache.sonuc.kalemler.map((k) =>
    k.listeId === listeId
      ? { ...k, urun: yeniUrun, adet: paketAdediHesapla(k.istenen ?? k.adet, k.birim, yeniUrun), avantajli: null }
      : k
  )
  const hesapItems = kalemler.map((k) => ({ id: k.urun.id, urun_id: k.urun.id, baslik: k.urun.title, adet: k.adet, depots: k.urun.depots }))
  cache.sonuc = { ...cache.sonuc, kalemler, hesap: sepetHesapla(hesapItems) }
  emit()
}

// Bir kalemde en ucuz marketi istemeyip yeniden seç (marka bir daha getirilmez)
export async function markaIstemeVeYenidenSec(listeId, markaAdi, konum) {
  markaIstenmez(listeId, markaAdi)
  return sepetiOlustur(konum)
}

// Belirli ürünü bir daha getirme + yeniden seç
export async function urunIstemeVeYenidenSec(listeId, urunId, konum) {
  urunIstenmez(listeId, urunId)
  return sepetiOlustur(konum)
}

export function sonucuTemizle() { cache.sonuc = null; emit() }

// Basit yerel ayrıştırıcı (Gemini yoksa): "2 süt, ekmek, çamaşır deterjanı"
export function basitAyristir(metin) {
  return String(metin)
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(\d+)\s*(?:adet|x)?\s+(.*)$/i)
      if (m) return { terim: m[2].trim(), adet: parseInt(m[1], 10) || 1 }
      return { terim: s, adet: 1 }
    })
    .filter((k) => k.terim)
}

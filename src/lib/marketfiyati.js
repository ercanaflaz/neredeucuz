// marketfiyati.org.tr API katmanı.
// İstekler kendi origin'imizdeki /api/mf/... adresine gider:
//  - yerelde: vite.config.js proxy -> api.marketfiyati.org.tr/api/v2
//  - yayında: functions/api/mf/[[path]].js (Cloudflare Pages Function)
// Bu sayede CORS sorunu olmaz.

// Yerelde (dev): vite proxy /api/mf → CORS derdi olmadan çalışır.
// Canlıda (prod): marketfiyati Cloudflare sunucularını blokluyor; ama tarayıcıdan
// DOĞRUDAN çağrıya CORS izni veriyor. Bu yüzden prod'da doğrudan çağırırız —
// her kullanıcı kendi ev IP'siyle bağlanır, datacenter bloğu devre dışı kalır.
const BASE = import.meta.env.DEV ? '/api/mf' : 'https://api.marketfiyati.org.tr/api/v2'

async function post(endpoint, body) {
  const res = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API ${endpoint} hata: ${res.status}`)
  return res.json()
}

// Konumla arama yaparken kullanılacak varsayılan bölge yarıçapı (km).
export const VARSAYILAN_YARICAP_KM = 20

const konumVarMi = (loc) => Boolean(loc && loc.latitude && loc.longitude)

// Bölgedeki depoların id listesini getirir (/nearest). marketfiyati /search
// konuma göre SADECE bu depo id'leriyle doğru süzüyor.
async function bolgeDepoIdleri(loc) {
  try {
    const res = await nearestDepots(loc, loc.distance ?? VARSAYILAN_YARICAP_KM)
    const list = Array.isArray(res) ? res : (res?.content ?? [])
    return list.map((d) => d.id).filter(Boolean)
  } catch {
    return []
  }
}

// İki koordinat arası mesafe (km) — haversine.
// Koordinat metin olarak gelebilir; sayıya çeviririz. Geçersiz/eksik/(0,0)
// koordinatta null döner (bilinmiyor) — filtre bunu ELEMEZ (güvenli taraf).
export function mesafeKm(lat1, lon1, lat2, lon2) {
  const a1 = Number(lat1), o1 = Number(lon1), a2 = Number(lat2), o2 = Number(lon2)
  if ([a1, o1, a2, o2].some((v) => !Number.isFinite(v))) return null
  if (a2 === 0 && o2 === 0) return null // koordinat yok sayılır
  const R = 6371
  const d2r = (d) => (d * Math.PI) / 180
  const dLat = d2r(a2 - a1)
  const dLon = d2r(o2 - o1)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(d2r(a1)) * Math.cos(d2r(a2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

// İsimle / anahtar kelimeyle ürün arama.
// Konum varsa iki adım: (1) /nearest ile bölge depo id'leri, (2) /search'e
// depots dizisiyle. Konum yoksa Türkiye geneli arama.
export async function searchByKeyword(keywords, loc) {
  const body = { keywords, pages: 0, size: 24 }
  if (konumVarMi(loc)) {
    const depots = await bolgeDepoIdleri(loc)
    return post('search', {
      ...body,
      latitude: loc.latitude,
      longitude: loc.longitude,
      distance: loc.distance ?? VARSAYILAN_YARICAP_KM,
      // depots bulunduysa gönder; boşsa alan gönderme (API'yi kilitlememek için)
      ...(depots.length ? { depots } : {}),
    })
  }
  return post('search', body)
}

// Barkod ile arama. Barkod tek ürünü döndürür; bölge süzmesini istemci
// tarafındaki mesafe filtresi yapar (searchByIdentity depots almıyor).
export async function searchByBarcode(barcode, loc) {
  const body = { identity: String(barcode), identityType: 'barcode' }
  if (konumVarMi(loc)) {
    return post('searchByIdentity', {
      ...body,
      latitude: loc.latitude,
      longitude: loc.longitude,
      distance: loc.distance ?? VARSAYILAN_YARICAP_KM,
    })
  }
  return post('searchByIdentity', body)
}

// Tek ürünü id'siyle sorgular — o ürünü satan TÜM marketlerin fiyatını
// döndürür (ürün detayında birkaç marketi fiyata göre göstermek için).
export function urunGetirById(id, loc) {
  const body = { identity: String(id), identityType: 'id' }
  if (konumVarMi(loc)) {
    body.latitude = loc.latitude
    body.longitude = loc.longitude
    body.distance = loc.distance ?? VARSAYILAN_YARICAP_KM
  }
  return post('searchByIdentity', body)
}

// En yakın mağazalar (depolar). distance km cinsinden.
export function nearestDepots(loc, distanceKm = 5) {
  return post('nearest', {
    latitude: loc.latitude,
    longitude: loc.longitude,
    distance: distanceKm,
  })
}

// /nearest yanıtını sadeleştir: her mağaza {market, sube, mesafe(m), lat, lon}.
export function normalizeNearest(apiResponse) {
  const list = Array.isArray(apiResponse) ? apiResponse : (apiResponse?.content ?? [])
  return list
    .map((d) => ({
      id: d.id,
      market: d.marketName || d.marketAdi || '',
      sube: d.sellerName || d.depotName || '',
      mesafe: typeof d.distance === 'number' ? d.distance : null,
      lat: d.location?.lat ?? d.latitude,
      lon: d.location?.lon ?? d.longitude,
    }))
    .sort((a, b) => (a.mesafe ?? 1e9) - (b.mesafe ?? 1e9))
}

// Paket boyutunu çöz (ör. "170 Gr" → {baz:'kg', miktar:0.17}). Birim fiyat için.
function paketBoyutu(item) {
  let miktar = Number(item.refinedVolumeOrWeight)
  let birimAd = String(item.refinedQuantityUnit || '').toLocaleLowerCase('tr').trim()
  // refined alanlar yoksa başlıktan çöz
  if (!Number.isFinite(miktar) || miktar <= 0 || !birimAd) {
    const m = String(item.title || '').toLocaleLowerCase('tr').match(/(\d+(?:[.,]\d+)?)\s*(kg|gr|g|ml|lt|l|cl|adet|yaprak|rulo)\b/)
    if (m) { miktar = parseFloat(m[1].replace(',', '.')); birimAd = m[2] }
  }
  if (!Number.isFinite(miktar) || miktar <= 0) return null
  if (birimAd === 'kg') return { baz: 'kg', miktar }
  if (birimAd === 'gr' || birimAd === 'g') return { baz: 'kg', miktar: miktar / 1000 }
  if (birimAd === 'lt' || birimAd === 'l') return { baz: 'lt', miktar }
  if (birimAd === 'ml') return { baz: 'lt', miktar: miktar / 1000 }
  if (birimAd === 'cl') return { baz: 'lt', miktar: miktar / 100 }
  return { baz: 'adet', miktar } // adet, yaprak, rulo...
}

// API yanıtındaki içerik listesini sadeleştir.
// loc verilirse SADECE o bölgedeki (yarıçap içindeki) mağazalar gösterilir;
// başka illerdeki/uzak mağazalar tamamen elenir. Bölgede hiç mağaza kalmayan
// ürünler listeden düşer.
export function normalize(apiResponse, loc) {
  const content = apiResponse?.content ?? []
  const yaricap = loc?.distance ?? VARSAYILAN_YARICAP_KM
  const konumVar = Boolean(loc && loc.latitude && loc.longitude)

  const urunler = content.map((item) => {
    let depots = (item.productDepotInfoList ?? []).map((d) => ({
      market: d.marketAdi,
      depotName: d.depotName,
      price: d.price,
      unitPrice: d.unitPrice,
      latitude: d.latitude,
      longitude: d.longitude,
      indexTime: d.indexTime,
      mesafe: konumVar ? mesafeKm(loc.latitude, loc.longitude, d.latitude, d.longitude) : null,
    }))

    // Bölge filtresi (istemci tarafı backstop). Sunucu zaten /nearest depolarıyla
    // süzüyor; burada sadece AÇIKÇA başka şehirdeki depoları eleriz. Sınırdaki
    // yakın depoları düşürmemek için +10 km tampon. Koordinatı bilinmeyen elenmez.
    const sinir = yaricap + 10
    if (konumVar) depots = depots.filter((d) => d.mesafe == null || d.mesafe <= sinir)

    depots.sort((a, b) => a.price - b.price)
    const prices = depots.map((d) => d.price)
    const minPrice = prices.length ? Math.min(...prices) : null
    // Birim fiyat: önce paket boyutundan hesapla (güvenilir), yoksa API unitPrice.
    const boyut = paketBoyutu(item)
    const apiBF = depots.map((d) => d.unitPrice).filter((v) => Number.isFinite(v) && v > 0)
    const hesapBF = boyut && minPrice != null ? minPrice / boyut.miktar : null
    return {
      id: item.id,
      title: item.title,
      brand: item.brand,
      imageUrl: item.imageUrl,
      quantityUnit: item.refinedQuantityUnit,
      volumeOrWeight: item.refinedVolumeOrWeight,
      categories: item.categories ?? [],
      depots,
      cheapest: depots[0] ?? null,
      minPrice,
      maxPrice: prices.length ? Math.max(...prices) : null,
      // Birim fiyat (₺/kg, ₺/lt, ₺/adet) ve baz birim — "avantajlı" seçimi için.
      birimFiyat: hesapBF ?? (apiBF.length ? Math.min(...apiBF) : null),
      birimAdi: boyut?.baz || (item.refinedQuantityUnit || null),
      paketMiktar: boyut?.miktar ?? null,
      marketCount: depots.length,
    }
  })

  // Konum varsa, bölgede hiç mağazası kalmayan ürünleri gösterme.
  return konumVar ? urunler.filter((u) => u.depots.length > 0) : urunler
}

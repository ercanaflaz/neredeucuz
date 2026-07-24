// Google Maps yol tarifi (rota) linki üretir. Koordinat varsa ona yönlendirir
// (en doğru), yoksa market adı/adres aramasına düşer. Link her platformda çalışır:
// mobilde Maps uygulamasını, masaüstünde web'i açar ve kullanıcının konumundan rota çizer.
export function yolTarifiUrl({ lat, lon, ad, yuru = false } = {}) {
  const enlem = Number(lat)
  const boylam = Number(lon)
  if (Number.isFinite(enlem) && Number.isFinite(boylam) && !(enlem === 0 && boylam === 0)) {
    const mod = yuru ? '&travelmode=walking' : ''
    return `https://www.google.com/maps/dir/?api=1&destination=${enlem},${boylam}${mod}`
  }
  if (ad && ad.trim()) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ad.trim())}`
  return null
}

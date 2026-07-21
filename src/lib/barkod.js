// Barkodu dış kaynaklardan tanıma (marketfiyati'de bulunamadığında).
// Open Food Facts: ücretsiz, anahtarsız, CORS açık. Türk ürünlerinde kapsama sınırlı.

export async function barkodCoz(kod) {
  const b = String(kod || '').replace(/\D/g, '')
  if (b.length < 8) return null
  try {
    const r = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(b)}.json?fields=product_name,product_name_tr,generic_name,brands`,
    )
    if (r.ok) {
      const d = await r.json()
      if (d?.status === 1 && d.product) {
        const p = d.product
        const ad = String(p.product_name_tr || p.product_name || p.generic_name || '').trim()
        if (ad) {
          const marka = String(p.brands || '').split(',')[0]?.trim() || null
          return { ad, marka, kaynak: 'Open Food Facts' }
        }
      }
    }
  } catch { /* erişilemedi */ }
  return null
}

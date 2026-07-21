// Barkodu dış kaynaklardan tanıma (marketfiyati'de bulunamadığında).
// 1) barkodoku (kendi /api/barkod fonksiyonumuz — Türk ürünlerinde iyi, anahtar sunucuda gizli)
// 2) Open Food Facts (ücretsiz yedek; daha çok uluslararası/gıda)

export async function barkodCoz(kod) {
  const b = String(kod || '').replace(/\D/g, '')
  if (b.length < 8) return null

  // 1) barkodoku
  try {
    const r = await fetch(`/api/barkod/${b}`)
    if (r.ok) {
      const d = await r.json()
      if (d?.bulundu && d.ad) return { ad: d.ad, marka: null, kaynak: 'barkodoku' }
    }
  } catch { /* erişilemedi */ }

  // 2) Open Food Facts
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

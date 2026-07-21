// Para ve tarih biçimlendirme yardımcıları.

export function tl(value) {
  if (value == null || isNaN(value)) return '—'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(value)
}

export function tarih(isoLike) {
  if (!isoLike) return ''
  const d = new Date(isoLike)
  if (isNaN(d)) return ''
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

// İki fiyat arasındaki tasarruf yüzdesi.
export function tasarrufYuzde(min, max) {
  if (!min || !max || max <= min) return 0
  return Math.round(((max - min) / max) * 100)
}

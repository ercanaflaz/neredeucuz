import { supabase } from './supabase'
import { POPULER } from '../data/populer'

// Gerçek arama kayıtlarından (olaylar tablosu, tur='arama') en çok aranan
// kelimeleri üretir. Yeterli gerçek veri yoksa statik POPULER listesine düşer.
export async function populerAramalariGetir(adet = 12) {
  try {
    const { data, error } = await supabase
      .from('olaylar')
      .select('baslik')
      .eq('tur', 'arama')
      .not('baslik', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5000)
    if (error || !Array.isArray(data) || !data.length) return yedek(adet)

    const say = new Map()
    for (const r of data) {
      const ham = String(r.baslik || '').trim()
      const k = ham.toLocaleLowerCase('tr')
      if (k.length < 2) continue
      const mevcut = say.get(k)
      if (mevcut) mevcut.sayi += 1
      else say.set(k, { terim: ham, sayi: 1 })
    }

    const sirali = [...say.values()]
      .sort((a, b) => b.sayi - a.sayi)
      .slice(0, adet)
      .map((x) => ({ terim: x.terim, ad: baslikYap(x.terim), sayi: x.sayi }))

    // En az birkaç farklı gerçek arama olmalı ki liste anlamlı olsun
    return sirali.length >= 4 ? sirali : yedek(adet)
  } catch {
    return yedek(adet)
  }
}

function baslikYap(t) {
  return t ? t.charAt(0).toLocaleUpperCase('tr') + t.slice(1) : t
}

function yedek(adet) {
  return POPULER.slice(0, adet).map((p) => ({ terim: p.terim, ad: p.ad, emoji: p.emoji, kat: p.kat }))
}

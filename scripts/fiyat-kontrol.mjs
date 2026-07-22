// neredeucuz — Otomatik fiyat düşüş alarmı kontrolü.
// GitHub Actions'ta (zamanlanmış) çalışır. marketfiyati Cloudflare'i engellediği
// için bu iş CF'de DEĞİL, GitHub runner'ında yapılır.
//
// Akış: aktif+bildirilmemiş alarmları çek → her ürünün güncel en ucuz fiyatını
// marketfiyati'den al → hedefin altına inmişse o kullanıcının push abonelerine
// bildirim gönder → alarmı "bildirildi" işaretle.
//
// Gerekli ortam değişkenleri (GitHub Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_KEY, VAPID_PRIVATE_JWK
import { buildPushHTTPRequest } from '@pushforge/builder'

const URL_SB = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const SERVIS = process.env.SUPABASE_SERVICE_KEY || ''
const JWK = process.env.VAPID_PRIVATE_JWK || ''
const MF = 'https://api.marketfiyati.org.tr/api/v2'
const ADMIN_MAIL = 'mailto:aflazercan@gmail.com'
const BEKLE = (ms) => new Promise((r) => setTimeout(r, ms))

if (!URL_SB || !SERVIS || !JWK) {
  console.error('Eksik env: SUPABASE_URL / SUPABASE_SERVICE_KEY / VAPID_PRIVATE_JWK')
  process.exit(1)
}
const sbHead = { apikey: SERVIS, authorization: 'Bearer ' + SERVIS, 'content-type': 'application/json' }

async function sbGet(path) {
  const r = await fetch(URL_SB + '/rest/v1/' + path, { headers: sbHead })
  if (!r.ok) throw new Error('Supabase GET ' + path + ' → ' + r.status)
  return r.json()
}
async function sbPatch(path, body) {
  await fetch(URL_SB + '/rest/v1/' + path, { method: 'PATCH', headers: { ...sbHead, prefer: 'return=minimal' }, body: JSON.stringify(body) })
}
async function sbDelete(path) {
  await fetch(URL_SB + '/rest/v1/' + path, { method: 'DELETE', headers: sbHead })
}

// marketfiyati'den ürünün güncel EN UCUZ fiyatı (Türkiye geneli)
async function guncelFiyat(urunId) {
  const r = await fetch(MF + '/searchByIdentity', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identity: String(urunId), identityType: 'id' }),
  })
  if (r.status === 418 || r.status === 403) throw new Error('MF_BLOCK_' + r.status)
  if (!r.ok) return null
  const j = await r.json().catch(() => null)
  const item = j?.content?.[0]
  const fiyatlar = (item?.productDepotInfoList ?? []).map((d) => Number(d.price)).filter((v) => Number.isFinite(v) && v > 0)
  if (!fiyatlar.length) return null
  return { min: Math.min(...fiyatlar), baslik: item.title || null }
}

async function pushGonder(privateJWK, abonelik, mesaj) {
  const { endpoint, headers, body } = await buildPushHTTPRequest({
    privateJWK, subscription: abonelik,
    message: { payload: { title: mesaj.baslik, body: mesaj.mesaj, url: mesaj.url || '/', tag: 'fiyat-alarmi' }, adminContact: ADMIN_MAIL, options: { ttl: 86400, urgency: 'high' } },
  })
  const r = await fetch(endpoint, { method: 'POST', headers, body })
  return r.status
}

async function main() {
  const privateJWK = JSON.parse(JWK)
  const alarmlar = await sbGet('fiyat_alarmlari?select=id,kullanici_id,urun_id,baslik,hedef_fiyat,son_fiyat&aktif=eq.true&bildirildi=eq.false&limit=1000')
  console.log('Kontrol edilecek alarm:', alarmlar.length)
  if (!alarmlar.length) return

  let tetiklenen = 0, gonderilen = 0, temizlenen = 0
  const simdi = new Date().toISOString()

  for (const a of alarmlar) {
    let fiyat
    try { fiyat = await guncelFiyat(a.urun_id) } catch (e) {
      if (String(e.message).startsWith('MF_BLOCK')) {
        console.error('⛔ marketfiyati bu sunucuyu engelledi (' + e.message + '). Farklı bir çalıştırma ortamı gerekir.')
        process.exit(2)
      }
      fiyat = null
    }
    await BEKLE(350) // marketfiyati'yi yormamak için
    if (!fiyat) { await sbPatch('fiyat_alarmlari?id=eq.' + a.id, { son_kontrol: simdi }); continue }

    if (fiyat.min <= Number(a.hedef_fiyat)) {
      tetiklenen++
      const aboneler = await sbGet('push_abonelikleri?kullanici_id=eq.' + a.kullanici_id + '&select=endpoint,abonelik')
      const mesaj = {
        baslik: '🎯 Fiyat düştü: ' + (a.baslik || fiyat.baslik || 'ürün'),
        mesaj: `Hedefin ${Number(a.hedef_fiyat).toFixed(2)}₺ — şimdi ${fiyat.min.toFixed(2)}₺'ye indi. Hemen bak!`,
        url: '/#/',
      }
      for (const s of aboneler) {
        try {
          const durum = await pushGonder(privateJWK, s.abonelik, mesaj)
          if (durum >= 200 && durum < 300) gonderilen++
          else if (durum === 404 || durum === 410) { await sbDelete('push_abonelikleri?endpoint=eq.' + encodeURIComponent(s.endpoint)); temizlenen++ }
        } catch { /* atla */ }
      }
      await sbPatch('fiyat_alarmlari?id=eq.' + a.id, { bildirildi: true, son_fiyat: fiyat.min, son_kontrol: simdi })
    } else {
      await sbPatch('fiyat_alarmlari?id=eq.' + a.id, { son_fiyat: fiyat.min, son_kontrol: simdi })
    }
  }

  console.log(`Bitti. Tetiklenen alarm: ${tetiklenen}, gönderilen bildirim: ${gonderilen}, temizlenen abonelik: ${temizlenen}`)
}

main().catch((e) => { console.error('HATA:', e); process.exit(1) })

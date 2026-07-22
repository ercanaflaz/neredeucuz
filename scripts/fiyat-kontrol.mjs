// neredeucuz — Otomatik fiyat düşüş alarmı kontrolü.
// GitHub Actions'ta (zamanlanmış) çalışır. marketfiyati Cloudflare'i engellediği
// için bu iş CF'de DEĞİL, GitHub runner'ında yapılır.
//
// Gerekli ortam değişkenleri (GitHub Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_KEY, VAPID_PRIVATE_JWK
//
// ŞİFRELEME: modern "aes128gcm" (RFC 8291) — iOS/Safari dahil çalışır.
// (Eski "@pushforge/builder" "aesgcm" şeması Apple'da gösterilmiyordu.)
import { pushGonder } from '../functions/api/_webpush.js'

const URL_SB = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '')
const SERVIS = (process.env.SUPABASE_SERVICE_KEY || '').trim()
const JWK = (process.env.VAPID_PRIVATE_JWK || '').trim()
const MF = 'https://api.marketfiyati.org.tr/api/v2'
const ADMIN_MAIL = 'mailto:aflazercan@gmail.com'
const BEKLE = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- 0) ORTAM TEŞHİSİ ----------
console.log('--- Ortam kontrolü ---')
console.log('SUPABASE_URL      :', URL_SB ? URL_SB : '❌ BOŞ')
console.log('SUPABASE_SERVICE_KEY:', SERVIS ? `✓ (${SERVIS.length} karakter, "${SERVIS.slice(0, 8)}…")` : '❌ BOŞ')
console.log('VAPID_PRIVATE_JWK :', JWK ? `✓ (${JWK.length} karakter)` : '❌ BOŞ')
if (!URL_SB || !SERVIS || !JWK) {
  console.error('❌ Eksik ortam değişkeni var. GitHub → Settings → Secrets and variables → Actions → Secrets sekmesini kontrol et.')
  process.exit(1)
}

// VAPID JWK gerçekten JSON mu?
let privateJWK
try {
  privateJWK = JSON.parse(JWK)
  if (!privateJWK.d || privateJWK.kty !== 'EC') throw new Error('beklenen alanlar yok (kty=EC, d)')
  console.log('VAPID JWK JSON    : ✓ geçerli')
} catch (e) {
  console.error('❌ VAPID_PRIVATE_JWK geçerli bir JWK değil:', e.message)
  console.error('   Değer şununla başlamalı: {"alg":"ES256",...,"d":"..."}')
  process.exit(1)
}

const sbHead = { apikey: SERVIS, authorization: 'Bearer ' + SERVIS, 'content-type': 'application/json' }

async function sbGet(path) {
  const r = await fetch(URL_SB + '/rest/v1/' + path, { headers: sbHead })
  if (!r.ok) {
    const gov = await r.text().catch(() => '')
    throw new Error(`Supabase GET ${path.split('?')[0]} → ${r.status} ${gov.slice(0, 160)}`)
  }
  return r.json()
}
async function sbPatch(path, body) {
  await fetch(URL_SB + '/rest/v1/' + path, { method: 'PATCH', headers: { ...sbHead, prefer: 'return=minimal' }, body: JSON.stringify(body) })
}
async function sbDelete(path) {
  await fetch(URL_SB + '/rest/v1/' + path, { method: 'DELETE', headers: sbHead })
}

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

async function bildirimGonder(abonelik, mesaj) {
  return pushGonder({
    jwk: privateJWK,
    subject: ADMIN_MAIL,
    subscription: abonelik,
    payload: { title: mesaj.baslik, body: mesaj.mesaj, url: mesaj.url || '/', tag: 'fiyat-alarmi' },
    ttl: 86400,
    urgency: 'high',
  })
}

async function main() {
  // Supabase bağlantısını test et (net hata mesajı için)
  console.log('--- Supabase kontrolü ---')
  const alarmlar = await sbGet('fiyat_alarmlari?select=id,kullanici_id,urun_id,baslik,hedef_fiyat,son_fiyat&aktif=eq.true&bildirildi=eq.false&limit=1000')
  console.log('✓ Supabase bağlandı. Kontrol edilecek aktif alarm:', alarmlar.length)
  if (!alarmlar.length) { console.log('Bekleyen alarm yok — bitti.'); return }

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
    await BEKLE(350)
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
          const durum = await bildirimGonder(s.abonelik, mesaj)
          if (durum >= 200 && durum < 300) gonderilen++
          else if (durum === 404 || durum === 410) { await sbDelete('push_abonelikleri?endpoint=eq.' + encodeURIComponent(s.endpoint)); temizlenen++ }
        } catch { /* atla */ }
      }
      await sbPatch('fiyat_alarmlari?id=eq.' + a.id, { bildirildi: true, son_fiyat: fiyat.min, son_kontrol: simdi })
    } else {
      await sbPatch('fiyat_alarmlari?id=eq.' + a.id, { son_fiyat: fiyat.min, son_kontrol: simdi })
    }
  }

  console.log(`✅ Bitti. Tetiklenen alarm: ${tetiklenen}, gönderilen bildirim: ${gonderilen}, temizlenen abonelik: ${temizlenen}`)
}

main().catch((e) => { console.error('❌ HATA:', e.message || e); process.exit(1) })

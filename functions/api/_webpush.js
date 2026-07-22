// neredeucuz — Web Push gönderimi (aes128gcm / RFC 8291 + RFC 8188).
//
// NEDEN: eski "@pushforge/builder" paketi "aesgcm" (eski taslak) şeması
// kullanıyordu; Apple (web.push.apple.com / iOS) bunu güvenilir biçimde
// GÖSTERMİYOR. Bu modül modern "aes128gcm" şemasını üretir — masaüstü
// (FCM), Firefox ve iOS/Safari'de çalışır.
//
// Yalnızca Web Crypto API + fetch kullanır: hem Cloudflare Workers hem de
// Node 20+ hem de Deno'da çalışır. Harici bağımlılık YOK.
//
// Dosya adı "_" ile başladığı için Cloudflare Pages bunu ROTA saymaz;
// sadece import edilir.

const enc = new TextEncoder()

// ---- base64url yardımcıları ----
export function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
export function bytesToB64url(bytes) {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let bin = ''
  for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function concat(...arrs) {
  let len = 0
  for (const a of arrs) len += a.length
  const out = new Uint8Array(len)
  let o = 0
  for (const a of arrs) { out.set(a, o); o += a.length }
  return out
}

// ---- VAPID (JWT imzalama, ES256) ----
async function importVapidSignKey(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: jwk.d, x: jwk.x, y: jwk.y, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
}
// JWK'nin açık anahtarı (65 bayt: 0x04||x||y) → base64url (VAPID "k=")
function vapidPublicFromJwk(jwk) {
  const x = b64urlToBytes(jwk.x)
  const y = b64urlToBytes(jwk.y)
  return bytesToB64url(concat(new Uint8Array([0x04]), x, y))
}
async function vapidJwt(jwk, audience, subject, ttl) {
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const now = Math.floor(Date.now() / 1000)
  const payload = bytesToB64url(enc.encode(JSON.stringify({
    aud: audience,
    exp: now + Math.min(ttl || 86400, 86400),
    sub: subject,
  })))
  const signingInput = header + '.' + payload
  const key = await importVapidSignKey(jwk)
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(signingInput),
  )
  return signingInput + '.' + bytesToB64url(new Uint8Array(sig))
}

// ---- İçerik şifreleme (aes128gcm) ----
// asKeyPair ve saltIn yalnızca TEST için verilir; üretimde rastgele üretilir.
export async function encryptPayload(subscription, payloadStr, opts = {}) {
  const uaPublicRaw = b64urlToBytes(subscription.keys.p256dh) // 65 bayt
  const authSecret = b64urlToBytes(subscription.keys.auth)    // 16 bayt

  // Alıcının (tarayıcı) açık anahtarı — ECDH
  const uaPublicKey = await crypto.subtle.importKey(
    'raw', uaPublicRaw, { name: 'ECDH', namedCurve: 'P-256' }, true, [],
  )

  // Uygulama sunucusunun geçici (ephemeral) ECDH anahtar çifti
  const asKeyPair = opts.asKeyPair || await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  )
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey)) // 65 bayt

  // ECDH ortak sırrı (32 bayt)
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaPublicKey }, asKeyPair.privateKey, 256,
  ))

  const salt = opts.salt || crypto.getRandomValues(new Uint8Array(16))

  // RFC 8291 §3.4 — IKM türetimi
  //   key_info = "WebPush: info\0" || ua_public || as_public
  //   IKM = HKDF(salt=auth_secret, ikm=ecdh_secret, info=key_info, L=32)
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublicRaw, asPublicRaw)
  const ecdhKey = await crypto.subtle.importKey('raw', ecdhSecret, 'HKDF', false, ['deriveBits'])
  const ikm = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: keyInfo }, ecdhKey, 256,
  ))

  // RFC 8188 — CEK ve NONCE
  const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const cekBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: aes128gcm\0') }, ikmKey, 128,
  )
  const nonce = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: nonce\0') }, ikmKey, 96,
  ))
  const cek = await crypto.subtle.importKey('raw', cekBits, { name: 'AES-GCM' }, false, ['encrypt'])

  // Tek kayıt: plaintext || 0x02 (son kayıt sınırlayıcısı) — ek dolgu yok
  const record = concat(enc.encode(payloadStr), new Uint8Array([0x02]))
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 }, cek, record,
  ))

  // Gövde başlığı: salt(16) || rs(4, BE) || idlen(1)=65 || as_public(65)
  const rs = 4096
  const header = new Uint8Array(16 + 4 + 1 + 65)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, rs, false)
  header[20] = asPublicRaw.length // 65
  header.set(asPublicRaw, 21)

  return concat(header, ciphertext)
}

// ---- Tek aboneliğe gönder ----
// Döner: HTTP durum kodu (201 başarı; 404/410 ölü abonelik).
export async function pushGonder({ jwk, publicKeyB64, subject, subscription, payload, ttl = 86400, urgency = 'normal' }) {
  const origin = new URL(subscription.endpoint).origin
  const body = await encryptPayload(subscription, JSON.stringify(payload))
  const jwt = await vapidJwt(jwk, origin, subject, ttl)
  const k = publicKeyB64 || vapidPublicFromJwk(jwk)

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttl),
      Urgency: urgency,
      Authorization: `vapid t=${jwt}, k=${k}`,
    },
    body,
  })
  return res.status
}

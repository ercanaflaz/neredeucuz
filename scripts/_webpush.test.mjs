// RFC 8291 §5 test vektörü ile _webpush.js şifrelemesini doğrula.
import { encryptPayload, b64urlToBytes, bytesToB64url } from '../functions/api/_webpush.js'

const V = {
  plaintext: 'When I grow up, I want to be a watermelon',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  asPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  expected: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
}

// as anahtar çiftini raw d + açık noktadan içe aktar
const asPub = b64urlToBytes(V.asPublic)
const asJwk = {
  kty: 'EC', crv: 'P-256',
  d: V.asPrivate,
  x: bytesToB64url(asPub.slice(1, 33)),
  y: bytesToB64url(asPub.slice(33, 65)),
  ext: true,
}
const asPrivateKey = await crypto.subtle.importKey('jwk', asJwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
const asPublicKey = await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, true, [])

const subscription = { endpoint: 'https://example.com/x', keys: { p256dh: V.uaPublic, auth: V.auth } }

const body = await encryptPayload(subscription, V.plaintext, {
  asKeyPair: { privateKey: asPrivateKey, publicKey: asPublicKey },
  salt: b64urlToBytes(V.salt),
})
const got = bytesToB64url(body)

console.log('beklenen:', V.expected)
console.log('üretilen:', got)
if (got === V.expected) {
  console.log('\n✅ GEÇTİ — aes128gcm şifrelemesi RFC 8291 vektörüyle bire bir uyuşuyor.')
  process.exit(0)
} else {
  console.error('\n❌ KALDI — çıktı vektörle uyuşmuyor.')
  process.exit(1)
}

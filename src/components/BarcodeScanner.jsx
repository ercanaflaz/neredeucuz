import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { X, Keyboard } from 'lucide-react'

// Perakende barkod formatları (QR değil — hız ve doğruluk için sınırlıyoruz).
const FORMATLAR = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.ITF,
]

// Kamerayla barkod (EAN-13 vb.) tarar. Okununca onDetected(kod) çağırır.
export default function BarcodeScanner({ onDetected, onClose }) {
  const ref = useRef(null)
  const [hata, setHata] = useState(null)
  const [elle, setElle] = useState(false)
  const [kod, setKod] = useState('')

  useEffect(() => {
    if (elle) return // elle giriş modunda kamera çalışmasın
    const el = ref.current
    if (!el) return
    const scanner = new Html5Qrcode(el.id, {
      verbose: false,
      formatsToSupport: FORMATLAR,
      // Chrome/Android'in yerleşik BarcodeDetector'ını kullan — çok daha hızlı ve hassas.
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    })
    let durdu = false
    const basarili = (metin) => {
      if (durdu) return
      durdu = true
      // titreşimle geri bildirim (destekleyen cihazlarda)
      try { navigator.vibrate?.(60) } catch { /* yok */ }
      scanner.stop().catch(() => {}).finally(() => onDetected(String(metin).trim()))
    }
    // Görüntü kutusu: barkod için geniş ve yatay, kadraja göre ölçekli.
    const qrbox = (vw, vh) => {
      const w = Math.floor(Math.min(vw, vh, 340) * 0.9)
      return { width: w, height: Math.max(120, Math.floor(w * 0.6)) }
    }
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 15, qrbox, aspectRatio: 1.3333, disableFlip: false },
        basarili,
        () => {},
      )
      .catch((e) => setHata(kameraHatasi(e)))

    return () => {
      durdu = true
      scanner.stop().catch(() => {})
    }
  }, [onDetected, elle])

  function elleGonder(e) {
    e?.preventDefault()
    const t = kod.replace(/\D/g, '')
    if (t.length >= 8) onDetected(t)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 btn btn-circle btn-ghost text-white">
        <X />
      </button>

      {!elle ? (
        <>
          <p className="text-white/90 mb-3 text-center text-sm">
            Barkodu çerçeveye yatay ve net tut — otomatik okur.
          </p>
          <div id="barkod-okuyucu" ref={ref} className="w-full max-w-sm aspect-[4/3] overflow-hidden rounded-2xl bg-black" />
          {hata && (
            <div className="mt-4 max-w-sm text-center text-white/90 text-sm bg-error/20 rounded-xl p-3">
              {hata}
            </div>
          )}
          <button onClick={() => setElle(true)} className="btn btn-sm btn-outline text-white border-white/40 mt-4 gap-1.5">
            <Keyboard size={16} /> Okumuyor mu? Barkodu elle yaz
          </button>
        </>
      ) : (
        <form onSubmit={elleGonder} className="w-full max-w-sm space-y-3">
          <p className="text-white/90 text-center text-sm">Barkodun altındaki rakamları yaz:</p>
          <input
            value={kod}
            onChange={(e) => setKod(e.target.value)}
            inputMode="numeric"
            placeholder="örn: 8690000000000"
            autoFocus
            className="input input-lg w-full text-center tracking-widest"
          />
          <button type="submit" disabled={kod.replace(/\D/g, '').length < 8} className="btn btn-primary w-full">Ara</button>
          <button type="button" onClick={() => setElle(false)} className="btn btn-ghost btn-sm w-full text-white">← Kameraya dön</button>
        </form>
      )}
    </div>
  )
}

function kameraHatasi(e) {
  const msg = String(e?.message || e)
  if (/NotAllowed|Permission/i.test(msg)) return 'Kamera izni verilmedi. Tarayıcı ayarlarından izin ver.'
  if (/NotFound|no camera/i.test(msg)) return 'Kamera bulunamadı.'
  if (/secure|https/i.test(msg)) return 'Kamera için sayfa HTTPS üzerinden açılmalı.'
  return 'Kamera başlatılamadı: ' + msg
}

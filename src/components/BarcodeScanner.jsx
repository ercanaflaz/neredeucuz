import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X } from 'lucide-react'

// Kamerayla barkod (EAN-13 vb.) tarar. Okununca onDetected(kod) çağırır.
export default function BarcodeScanner({ onDetected, onClose }) {
  const ref = useRef(null)
  const [hata, setHata] = useState(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const scanner = new Html5Qrcode(el.id, { verbose: false })
    let durdu = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          if (durdu) return
          durdu = true
          scanner.stop().catch(() => {}).finally(() => onDetected(decodedText))
        },
        () => {}
      )
      .catch((e) => setHata(kameraHatasi(e)))

    return () => {
      durdu = true
      scanner.stop().catch(() => {})
    }
  }, [onDetected])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 btn btn-circle btn-ghost text-white">
        <X />
      </button>
      <p className="text-white/90 mb-3 text-center text-sm">
        Barkodu çerçevenin içine getir
      </p>
      <div id="barkod-okuyucu" ref={ref} className="w-full max-w-sm aspect-[4/3] overflow-hidden rounded-2xl bg-black" />
      {hata && (
        <div className="mt-4 max-w-sm text-center text-white/90 text-sm bg-error/20 rounded-xl p-3">
          {hata}
        </div>
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

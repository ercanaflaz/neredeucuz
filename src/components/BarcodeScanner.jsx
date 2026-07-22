import { useEffect, useRef, useState } from 'react'
import { X, Keyboard, Flashlight, FlashlightOff, Loader2 } from 'lucide-react'

// Barkod okuyucu — iOS'ta güçlü okuma için ZBar (WASM) + Android'de native
// BarcodeDetector. Kameradan merkezdeki tarama bandını yakalar, saniyede
// birkaç kez çözümler. Okununca onDetected(kod) çağrılır.
//
// Neden ZBar: EAN-13/UPC gibi 1D market barkodlarında zxing/html5-qrcode'a
// göre çok daha toleranslı (bulanık/eğik/az ışıkta bile okur).

const HEDEF_FORMATLAR = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)
  const donguRef = useRef({ dur: false, mesgul: false })
  const [hata, setHata] = useState(null)
  const [hazir, setHazir] = useState(false)
  const [elle, setElle] = useState(false)
  const [kod, setKod] = useState('')
  const [torchVar, setTorchVar] = useState(false)
  const [torchAcik, setTorchAcik] = useState(false)

  const onDetectedRef = useRef(onDetected)
  useEffect(() => { onDetectedRef.current = onDetected }, [onDetected])

  useEffect(() => {
    if (elle) return
    const durum = { dur: false, mesgul: false }
    donguRef.current = durum
    let detector = null
    let zbarTara = null

    const bulundu = (ham) => {
      const t = String(ham || '').replace(/\s/g, '').trim()
      if (!t) return
      durum.dur = true
      try { navigator.vibrate?.(60) } catch { /* iOS'ta yok */ }
      temizle()
      try { onDetectedRef.current(t) } catch { /* yut */ }
    }

    async function motorHazirla() {
      // 1) Native BarcodeDetector (Android Chrome — hızlı)
      if ('BarcodeDetector' in window) {
        try {
          const destekli = await window.BarcodeDetector.getSupportedFormats()
          const istenen = HEDEF_FORMATLAR.filter((f) => destekli.includes(f))
          if (istenen.length) detector = new window.BarcodeDetector({ formats: istenen })
        } catch { /* yok say */ }
      }
      // 2) ZBar-wasm (iOS/Safari ve geri kalan her yer — güçlü 1D okuma)
      if (!detector) {
        try {
          const mod = await import('@undecaf/zbar-wasm')
          zbarTara = mod.scanImageData
        } catch { /* aşağıda hata gösterilir */ }
      }
    }

    async function kamerayiBaslat() {
      if (!navigator.mediaDevices?.getUserMedia) { setHata('Bu tarayıcı kamerayı desteklemiyor.'); return }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 }, height: { ideal: 720 },
          },
          audio: false,
        })
        streamRef.current = stream
        const v = videoRef.current
        if (!v) return
        v.srcObject = stream
        v.setAttribute('playsinline', 'true')
        v.muted = true
        await v.play().catch(() => {})
        setHazir(true)

        // Fener (torch) desteği?
        const track = stream.getVideoTracks?.()[0]
        const caps = track?.getCapabilities?.()
        if (caps && 'torch' in caps && caps.torch) setTorchVar(true)
        // Sürekli odak (destekleyen cihazlarda netliği artırır)
        try { if (caps?.focusMode?.includes?.('continuous')) await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }) } catch { /* yok */ }
      } catch (e) { setHata(kameraHatasi(e)); return }
    }

    function kare() {
      const v = videoRef.current
      const cv = canvasRef.current
      if (!v || !cv || !v.videoWidth) return null
      const vw = v.videoWidth, vh = v.videoHeight
      // Merkezde geniş bir bant — barkod oraya hizalanır, gürültü azalır
      const cropW = Math.floor(vw * 0.92)
      const cropH = Math.floor(vh * 0.5)
      const sx = Math.floor((vw - cropW) / 2)
      const sy = Math.floor((vh - cropH) / 2)
      const olcek = Math.min(1, 1000 / cropW)
      cv.width = Math.max(2, Math.floor(cropW * olcek))
      cv.height = Math.max(2, Math.floor(cropH * olcek))
      const ctx = cv.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(v, sx, sy, cropW, cropH, 0, 0, cv.width, cv.height)
      return { ctx, cv }
    }

    async function dongu() {
      if (durum.dur) return
      if (!durum.mesgul) {
        durum.mesgul = true
        try {
          const k = kare()
          if (k) {
            if (detector) {
              const sonuc = await detector.detect(k.cv)
              if (sonuc && sonuc.length) bulundu(sonuc[0].rawValue)
            } else if (zbarTara) {
              const img = k.ctx.getImageData(0, 0, k.cv.width, k.cv.height)
              const semboller = await zbarTara(img)
              if (semboller && semboller.length) bulundu(semboller[0].decode())
            }
          }
        } catch { /* kareyi atla */ }
        durum.mesgul = false
      }
      if (!durum.dur) setTimeout(dongu, 120) // ~8 fps
    }

    function temizle() {
      durum.dur = true
      try { streamRef.current?.getTracks().forEach((t) => t.stop()) } catch { /* yok */ }
      streamRef.current = null
    }

    ;(async () => {
      await motorHazirla()
      if (durum.dur) return
      await kamerayiBaslat()
      if (durum.dur) return
      if (!detector && !zbarTara) { setHata('Barkod motoru yüklenemedi. Elle yazabilirsin.'); return }
      dongu()
    })()

    return () => { temizle() }
  }, [elle])

  async function torchDegis() {
    const track = streamRef.current?.getVideoTracks?.()[0]
    if (!track) return
    const yeni = !torchAcik
    try { await track.applyConstraints({ advanced: [{ torch: yeni }] }); setTorchAcik(yeni) } catch { /* yok */ }
  }

  function elleGonder(e) {
    e?.preventDefault()
    const t = kod.replace(/\D/g, '')
    if (t.length >= 8) onDetected(t)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 btn btn-circle btn-ghost text-white z-10"><X /></button>

      {!elle ? (
        <>
          <p className="text-white/90 mb-3 text-center text-sm">
            Barkodu <b>ortadaki çizgiye</b> yatay ve net getir — otomatik okur.
          </p>

          <div className="relative w-full max-w-sm aspect-[3/4] overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
            <canvas ref={canvasRef} className="hidden" />

            {/* Tarama çerçevesi + orta çizgi */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-[86%] h-[38%] rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] relative overflow-hidden">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-red-500/90" />
              </div>
            </div>

            {!hazir && !hata && (
              <div className="absolute inset-0 grid place-items-center text-white/80">
                <Loader2 className="animate-spin" />
              </div>
            )}

            {torchVar && (
              <button
                onClick={torchDegis}
                className={`absolute bottom-3 left-1/2 -translate-x-1/2 btn btn-sm btn-circle ${torchAcik ? 'btn-warning' : 'btn-ghost bg-black/40 text-white'}`}
                aria-label="Fener"
              >
                {torchAcik ? <Flashlight size={18} /> : <FlashlightOff size={18} />}
              </button>
            )}
          </div>

          {hata && (
            <div className="mt-4 max-w-sm text-center text-white/90 text-sm bg-error/20 rounded-xl p-3">{hata}</div>
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
  if (/NotFound|no camera|Requested device/i.test(msg)) return 'Kamera bulunamadı.'
  if (/NotReadable|in use|Could not start/i.test(msg)) return 'Kamera başka bir uygulama tarafından kullanılıyor olabilir.'
  if (/secure|https/i.test(msg)) return 'Kamera için sayfa HTTPS üzerinden açılmalı.'
  return 'Kamera başlatılamadı: ' + msg
}

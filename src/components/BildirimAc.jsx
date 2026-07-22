import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { pushDestekli, pushIzin, pushAboneMi, pushAc, pushKapat, iosStandaloneGerekli } from '../lib/push'

// "Bildirimleri aç" düğmesi/kartı. Fiyat düşünce ve kampanyalarda haber verir.
export default function BildirimAc({ className = '' }) {
  const [abone, setAbone] = useState(false)
  const [bekle, setBekle] = useState(false)
  const [hata, setHata] = useState('')
  const [ok, setOk] = useState('')
  const destek = pushDestekli()
  const iosGerek = destek && iosStandaloneGerekli()

  useEffect(() => { pushAboneMi().then(setAbone) }, [])

  async function ac() {
    setBekle(true); setHata(''); setOk('')
    try {
      const endpoint = await pushAc({ force: true }) // sıfırdan taze abonelik + kaydet
      setAbone(true)
      const son = (endpoint || '').slice(-6)
      setOk('Bildirimler açıldı ve kaydedildi ✓  (abonelik: …' + son + ')')
    } catch (e) {
      const m = String(e?.message || e)
      if (m === 'izin-yok') setHata('Bildirim izni verilmedi. iPhone: Ayarlar → Bildirimler → neredeucuz → izin ver.')
      else setHata(m) // TAM hata mesajı — nerede takıldığını görmek için
    } finally { setBekle(false) }
  }
  async function kapat() {
    setBekle(true); setHata(''); setOk('')
    try { await pushKapat(); setAbone(false) } finally { setBekle(false) }
  }

  if (!destek) return null

  return (
    <div className={`rounded-2xl border border-base-300 bg-base-100 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${abone ? 'bg-primary/15 text-primary' : 'bg-base-200 text-base-content/50'}`}>
          {abone ? <BellRing size={20} /> : <Bell size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm">Bildirimler</div>
          <p className="text-xs text-base-content/60 mt-0.5">
            Takip ettiğin ürün ucuzlayınca ve fırsatlarda <b>anında haber</b> verelim.
          </p>

          {iosGerek ? (
            <div className="mt-2 text-[11px] text-warning-content bg-warning/15 rounded-lg p-2">
              iPhone'da bildirim için önce uygulamayı <b>Ana Ekrana ekle</b>, sonra açılan uygulamadan bildirimi aç.
            </div>
          ) : pushIzin() === 'denied' ? (
            <div className="mt-2 text-[11px] text-error bg-error/10 rounded-lg p-2">
              Bildirim izni tarayıcıda engellenmiş. Site ayarlarından "Bildirimler"i izin ver yap.
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={ac}
                disabled={bekle}
                className="btn btn-sm btn-primary rounded-xl"
              >
                {bekle ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                {abone ? 'Bildirimleri yenile' : 'Bildirimleri aç'}
              </button>
              {abone && (
                <button onClick={kapat} disabled={bekle} className="btn btn-sm btn-ghost rounded-xl border border-base-300">
                  <BellOff size={16} /> Kapat
                </button>
              )}
            </div>
          )}

          {ok && (
            <div className="mt-2 text-[11px] text-success bg-success/10 rounded-lg p-2 flex items-start gap-1.5 break-all">
              <CheckCircle2 size={14} className="shrink-0 mt-px" /><span>{ok}</span>
            </div>
          )}
          {hata && (
            <div className="mt-2 text-[11px] text-error bg-error/10 rounded-lg p-2 flex items-start gap-1.5 break-all">
              <AlertTriangle size={14} className="shrink-0 mt-px" /><span>{hata}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

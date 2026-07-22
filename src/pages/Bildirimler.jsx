import { useEffect, useMemo, useState } from 'react'
import { useSyncExternalStore } from 'react'
import { Bell, BellOff, BellRing, Tag, Sparkles, Loader2, Check } from 'lucide-react'
import { subscribeBildirim, getBildirim, bildirimleriYukle, bildirimGoruldu, sonGorulenMs } from '../lib/bildirimler'
import { pushDestekli, pushIzin, pushAc, iosStandaloneGerekli } from '../lib/push'
import ReklamYuva from '../components/ReklamYuva'

// Reklam alanı — "REKLAM" etiketiyle içerikten net ayrılır (bildirimlerle karışmasın)
function ReklamAlani({ konum }) {
  return (
    <div className="relative pt-2">
      <span className="absolute top-0 left-3 z-10 text-[9px] font-bold uppercase tracking-wider text-base-content/40 bg-base-200 px-1.5 py-0.5 rounded-md">
        Reklam
      </span>
      <ReklamYuva konum={konum} adsenseSlot={import.meta.env.VITE_ADSENSE_SLOT_LIST} />
    </div>
  )
}

function zamanKisa(iso) {
  try {
    const fark = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
    if (fark < 60) return 'az önce'
    if (fark < 3600) return Math.floor(fark / 60) + ' dk önce'
    if (fark < 86400) return Math.floor(fark / 3600) + ' saat önce'
    if (fark < 604800) return Math.floor(fark / 86400) + ' gün önce'
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
  } catch { return '' }
}

const FILTRELER = [
  { key: 'hepsi', etiket: 'Tümü' },
  { key: 'duyuru', etiket: 'Duyurular' },
  { key: 'fiyat', etiket: 'Fiyat alarmları' },
]

// Bildirim kapalıysa çıkan ince açma şeridi
function AcmaSeridi() {
  const [bekle, setBekle] = useState(false)
  const [hata, setHata] = useState('')
  const [ok, setOk] = useState(false)
  if (!pushDestekli()) return null
  if (iosStandaloneGerekli()) {
    return (
      <div className="rounded-2xl bg-warning/10 border border-warning/20 p-3 text-[13px] text-warning-content flex items-center gap-2">
        <BellRing size={18} className="shrink-0 text-warning" />
        <span>iPhone'da bildirim için uygulamayı <b>Ana Ekrana ekle</b>, sonra açılan uygulamadan aç.</span>
      </div>
    )
  }
  if (ok || pushIzin() === 'granted') return null
  async function ac() {
    setBekle(true); setHata('')
    try { await pushAc({ force: true }); setOk(true) }
    catch (e) { setHata(String(e?.message || e) === 'izin-yok' ? 'Bildirim izni verilmedi.' : 'Bildirim açılamadı.') }
    finally { setBekle(false) }
  }
  return (
    <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
        <BellRing size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">Bildirimleri aç</p>
        <p className="text-[12px] text-base-content/60">Fiyat düşünce ve fırsatlarda anında haber ver.</p>
        {hata && <p className="text-[11px] text-error mt-0.5">{hata}</p>}
      </div>
      <button onClick={ac} disabled={bekle} className="btn btn-primary btn-sm rounded-xl shrink-0">
        {bekle ? <Loader2 size={16} className="animate-spin" /> : 'Aç'}
      </button>
    </div>
  )
}

export default function Bildirimler() {
  const bild = useSyncExternalStore(subscribeBildirim, getBildirim)
  const [filtre, setFiltre] = useState('hepsi')
  // Bu görünümde neyin "yeni" olduğunu sabitlemek için tabanı bir kez yakala
  const [taban] = useState(() => sonGorulenMs())

  useEffect(() => {
    bildirimleriYukle()
    const t = setTimeout(() => bildirimGoruldu(), 1200) // görüldü say → rozet sıfırlansın
    return () => clearTimeout(t)
  }, [])

  const sayimlar = useMemo(() => {
    const l = bild.liste
    return {
      hepsi: l.length,
      duyuru: l.filter((b) => b.tur !== 'fiyat').length,
      fiyat: l.filter((b) => b.tur === 'fiyat').length,
    }
  }, [bild.liste])

  const gosterilen = useMemo(() => {
    if (filtre === 'fiyat') return bild.liste.filter((b) => b.tur === 'fiyat')
    if (filtre === 'duyuru') return bild.liste.filter((b) => b.tur !== 'fiyat')
    return bild.liste
  }, [bild.liste, filtre])

  const okunmamis = bild.liste.filter((b) => new Date(b.created_at).getTime() > taban).length

  return (
    <div className="space-y-4">
      {/* Başlık */}
      <div className="flex items-center gap-2.5">
        <div className="relative w-10 h-10 rounded-2xl bg-primary/15 text-primary grid place-items-center">
          <Bell size={19} />
          {okunmamis > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white ring-2 ring-base-100 text-[10px] font-bold grid place-items-center">
              {okunmamis > 9 ? '9+' : okunmamis}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Bildirimler</h1>
          <p className="text-[12px] text-base-content/50">
            {okunmamis > 0 ? `${okunmamis} yeni bildirim` : 'Hepsi okundu'}
          </p>
        </div>
      </div>

      <AcmaSeridi />

      {/* Filtre sekmeleri */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {FILTRELER.map((f) => {
          const aktif = filtre === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFiltre(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition border ${
                aktif ? 'bg-primary text-primary-content border-primary' : 'bg-base-100 text-base-content/70 border-base-300 hover:bg-base-200'
              }`}
            >
              {f.etiket}
              <span className={`ml-1.5 text-[11px] ${aktif ? 'text-primary-content/80' : 'text-base-content/40'}`}>
                {sayimlar[f.key] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Reklam — liste üstü */}
      <ReklamAlani konum="bildirim-1" />

      {/* Liste */}
      {!bild.yuklendi ? (
        <div className="flex justify-center py-12 text-base-content/40"><Loader2 className="animate-spin" /></div>
      ) : gosterilen.length === 0 ? (
        <div className="text-center py-14 text-base-content/50">
          <BellOff size={42} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Henüz bildirim yok</p>
          <p className="text-sm mt-1">Takip ettiğin ürün ucuzlayınca ve fırsatlarda burada göreceksin.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {gosterilen.map((b) => {
            const fiyat = b.tur === 'fiyat'
            const yeni = new Date(b.created_at).getTime() > taban
            const link = b.url && b.url.startsWith('/#/') && b.url !== '/#/bildirimler' ? b.url : null
            const Etiket = link ? 'a' : 'div'
            return (
              <li key={b.id}>
                <Etiket
                  {...(link ? { href: link } : {})}
                  className={`relative flex gap-3 rounded-2xl border p-3.5 shadow-sm transition ${
                    yeni ? 'bg-primary/[0.06] border-primary/30' : 'bg-base-100 border-base-300'
                  } ${link ? 'hover:bg-base-200 cursor-pointer' : ''}`}
                >
                  {yeni && <span className="absolute left-0 top-4 bottom-4 w-1 rounded-r bg-secondary" />}
                  <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${fiyat ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary'}`}>
                    {fiyat ? <Tag size={18} /> : <Sparkles size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm leading-snug flex items-center gap-1.5">
                        {b.baslik}
                        {yeni && <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />}
                      </p>
                      <span className="text-[11px] text-base-content/40 shrink-0 mt-0.5">{zamanKisa(b.created_at)}</span>
                    </div>
                    {b.govde && <p className="text-[13px] text-base-content/60 mt-0.5 leading-snug">{b.govde}</p>}
                  </div>
                </Etiket>
              </li>
            )
          })}
        </ul>
      )}

      {bild.liste.length > 0 && okunmamis > 0 && (
        <button onClick={bildirimGoruldu} className="btn btn-ghost btn-sm w-full gap-2 text-base-content/60">
          <Check size={16} /> Tümünü okundu işaretle
        </button>
      )}

      {/* Reklam — liste altı */}
      <ReklamAlani konum="bildirim-2" />
    </div>
  )
}

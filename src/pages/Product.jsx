import { useState, useEffect, useSyncExternalStore } from 'react'
import { ChevronLeft, Heart, Bell, Trophy, ShoppingCart, Check, Loader2, RefreshCw, Navigation } from 'lucide-react'
import { tl, tarih, tasarrufYuzde } from '../lib/format'
import { urunGetirById, normalize } from '../lib/marketfiyati'
import { yolTarifiUrl } from '../lib/harita'
import AdSlot from '../components/AdSlot'
import MarketBadge from '../components/MarketBadge'
import ListeyeEkle from '../components/ListeyeEkle'
import {
  subscribe, getSnapshot, favoriMi, favoriEkle, favoriSil, alarmKur, alarmSil,
  sepeteEkle, sepetteMi,
} from '../lib/store'
import { girisIste } from '../lib/girisKapisi'
import { pushAc, pushAboneMi } from '../lib/push'

export default function Product({ urun: urunProp, onBack, user }) {
  const store = useSyncExternalStore(subscribe, getSnapshot)
  const [urun, setUrun] = useState(urunProp)
  const [zenginlestiriliyor, setZenginlestiriliyor] = useState(false)
  const [mesaj, setMesaj] = useState(null)

  // Yeni ürün açılınca yerel durumu sıfırla
  useEffect(() => { setUrun(urunProp) }, [urunProp])

  // Ürünü id'siyle TAZE sorgula: marketfiyati'nin EN GÜNCEL fiyatını uygula.
  // (Önceden yalnız daha fazla market bulunca güncelliyordu; bu yüzden aynı
  // market sayısında tıklama anındaki eski fiyat kalıyordu — düzeltildi.)
  async function fiyatCek() {
    const konum = getSnapshot().konum
    setZenginlestiriliyor(true)
    try {
      const res = await urunGetirById(urunProp.id, konum)
      const list = normalize(res, konum)
      const bul = list.find((x) => x.id === urunProp.id) || list[0]
      if (bul && (bul.depots?.length || 0) > 0) setUrun(bul) // taze fiyatı her zaman uygula
    } catch { /* yok */ }
    finally { setZenginlestiriliyor(false) }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fiyatCek() }, [urunProp.id])

  const fav = favoriMi(urun.id)
  const sepette = sepetteMi(urun.id)
  const alarm = store.alarmlar.find((a) => a.urun_id === urun.id) || null
  const tasarruf = tasarrufYuzde(urun.minPrice, urun.maxPrice)

  async function sepeteAt() {
    try { await sepeteEkle(urun) } catch (e) { setMesaj(e.message) }
  }

  async function favToggle() {
    if (!user) { girisIste('favorilere eklemek'); return }
    try {
      if (fav) {
        const kayit = store.favoriler.find((f) => f.urun_id === urun.id)
        if (kayit) await favoriSil(kayit.id)
      } else {
        await favoriEkle(urun)
      }
    } catch (e) {
      setMesaj(e.message)
    }
  }

  // Tek dokunuş: fiyat düşünce haber ver. Hedef = ŞU ANKİ en ucuz fiyat; bu fiyatın
  // ALTINA inince (fiyat-kontrol.mjs) otomatik push + uygulama içi bildirim gider.
  async function alarmToggle() {
    if (!user) { girisIste('fiyat düşünce haber almak'); return }
    if (alarm) {
      try { await alarmSil(alarm.id); setMesaj('Fiyat takibi kapatıldı.') } catch (e) { setMesaj(e.message) }
      return
    }
    if (!urun.minPrice) { setMesaj('Bu ürün için güncel fiyat bulunamadı.'); return }
    try {
      // Bildirim gidebilsin diye push izni yoksa iste (izin verilmezse alarm yine kaydolur).
      try { if (!(await pushAboneMi())) await pushAc({ force: false }) } catch { /* izin yok — sorun değil */ }
      await alarmKur(urun, urun.minPrice)
      setMesaj(`Tamam! Fiyat ${tl(urun.minPrice)} altına inince haber vereceğiz.`)
    } catch (e) {
      setMesaj(e.message)
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-base-content/60">
        <ChevronLeft size={18} /> Geri
      </button>

      {/* Başlık */}
      <div className="bg-base-100 rounded-2xl p-4 border border-base-300 flex gap-4">
        <div className="w-24 h-24 rounded-xl bg-base-200 shrink-0 overflow-hidden flex items-center justify-center">
          {urun.imageUrl ? (
            <img src={urun.imageUrl} alt="" className="w-full h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-1 opacity-80">
              <img src="/favicon.svg" alt="" className="w-8 h-8 rounded-lg" />
              <span className="text-[9px] font-extrabold leading-none"><span className="text-primary">nerede</span><span className="text-secondary">ucuz</span></span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold leading-tight">{urun.title}</h1>
          <div className="text-sm text-base-content/50">{urun.brand}</div>
          {urun.volumeOrWeight && (
            <div className="text-xs text-base-content/50 mt-1">
              {urun.volumeOrWeight} {urun.quantityUnit}
            </div>
          )}
        </div>
      </div>

      {/* Sepete ekle */}
      <button onClick={sepeteAt} className={`btn w-full ${sepette ? 'btn-success' : 'btn-secondary'}`}>
        {sepette ? <><Check size={18} /> Sepette — tekrar ekle</> : <><ShoppingCart size={18} /> Sepete ekle</>}
      </button>

      {/* Aksiyonlar */}
      <div className="flex gap-2">
        <button onClick={favToggle} className={`btn flex-1 ${fav ? 'btn-primary' : 'btn-outline'}`}>
          <Heart size={18} className={fav ? 'fill-current' : ''} /> {fav ? 'Favoride' : 'Favorile'}
        </button>
        <button onClick={alarmToggle} className={`btn flex-1 h-auto min-h-12 whitespace-normal leading-tight text-center ${alarm ? 'btn-secondary' : 'btn-outline'}`}>
          <Bell size={18} className={alarm ? 'fill-current' : ''} /> {alarm ? 'Haber vereceğiz' : 'Fiyat düşünce haber ver'}
        </button>
      </div>
      {alarm && (
        <p className="text-[11px] text-base-content/50 -mt-1 px-1">🔔 Fiyat <b>{tl(alarm.hedef_fiyat)}</b> altına inince otomatik bildirim göndereceğiz. Kapatmak için butona tekrar dokun.</p>
      )}

      {/* Kendi listene ekle */}
      <ListeyeEkle urun={urun} variant="full" className="w-full" />

      {mesaj && <div className="alert text-sm">{mesaj}</div>}

      {/* En ucuz özet */}
      {urun.cheapest && (
        <div className="bg-primary text-primary-content rounded-2xl p-4">
          <div className="flex items-center gap-2 text-sm opacity-90"><Trophy size={16} /> En ucuz burada</div>
          <div className="flex items-end justify-between mt-2">
            <div className="space-y-1">
              <div className="scale-110 origin-left"><MarketBadge market={urun.cheapest.market} /></div>
              {urun.cheapest.unitPrice && (
                <div className="text-sm opacity-80">{urun.cheapest.unitPrice}</div>
              )}
            </div>
            <div className="text-3xl font-extrabold">{tl(urun.minPrice)}</div>
          </div>
          {tasarruf > 0 && (
            <div className="text-sm mt-2 opacity-90">En pahalı markete göre %{tasarruf} tasarruf ({tl(urun.maxPrice)})</div>
          )}
        </div>
      )}

      {/* Market listesi */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-base-content/60 px-1 flex items-center gap-2">
          Marketlere göre fiyatlar
          {urun.marketCount > 0 && <span className="badge badge-ghost badge-sm">{urun.marketCount} market</span>}
          <button onClick={fiyatCek} disabled={zenginlestiriliyor} className="ml-auto btn btn-ghost btn-xs gap-1 text-base-content/50" title="Fiyatları yenile">
            {zenginlestiriliyor ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} yenile
          </button>
        </div>
        {urun.depots.map((d, i) => (
          <div key={i} className={`bg-base-100 rounded-xl p-3 border flex items-center justify-between gap-2 ${i === 0 ? 'border-primary/50 ring-1 ring-primary/20' : 'border-base-300'}`}>
            <div className="min-w-0 flex items-center gap-2">
              <MarketBadge market={d.market} size="sm" />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{d.depotName || d.market}</div>
                <div className="text-[11px] text-base-content/40 truncate">
                  {d.mesafe != null && `${d.mesafe.toFixed(1)} km`}
                  {d.mesafe != null && d.indexTime ? ' · ' : ''}
                  {d.indexTime ? tarih(d.indexTime) : ''}
                  {i === 0 ? <span className="text-primary font-semibold"> · en ucuz</span> : ''}
                </div>
                {(() => {
                  const url = yolTarifiUrl({ lat: d.latitude, lon: d.longitude, ad: `${d.market} ${d.depotName || ''}`, yuru: d.mesafe != null && d.mesafe <= 1.5 })
                  if (!url) return null
                  return (
                    <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-semibold text-primary hover:underline">
                      <Navigation size={11} /> Yol tarifi
                    </a>
                  )
                })()}
              </div>
            </div>
            <div className="text-right shrink-0 pl-2">
              <div className={`font-bold ${i === 0 ? 'text-primary' : ''}`}>{tl(d.price)}</div>
              {d.unitPrice && <div className="text-[11px] text-base-content/50">{d.unitPrice}</div>}
            </div>
          </div>
        ))}
        {!urun.depots.length && (
          <div className="text-sm text-base-content/50">Bu ürün için market fiyatı bulunamadı.</div>
        )}
      </div>

      <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_PRODUCT} />

      <p className="text-[11px] text-base-content/40 text-center">
        Fiyatlar marketfiyati.org.tr verisine dayanır ve anlık değişebilir.
      </p>
    </div>
  )
}

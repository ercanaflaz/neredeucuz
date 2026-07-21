import { useSyncExternalStore, useMemo } from 'react'
import { Minus, Plus, Trash2, ShoppingCart, Trophy, Store, Wand2 } from 'lucide-react'
import { subscribe, getSnapshot, adetDegistir, sepettenCikar, sepetiBosalt } from '../lib/store'
import { sepetHesapla } from '../lib/sepet'
import { marka } from '../lib/markets'
import { tl } from '../lib/format'
import MarketBadge from '../components/MarketBadge'
import AdSlot from '../components/AdSlot'

export default function Cart({ user, onAkilli }) {
  const store = useSyncExternalStore(subscribe, getSnapshot)
  const h = useMemo(() => sepetHesapla(store.sepet), [store.sepet])

  // Ürünleri firmaya göre grupla (her ürünün en ucuz olduğu market).
  const gruplar = useMemo(() => {
    const map = new Map()
    for (const k of h.kalemler) {
      const ad = k.enUcuz ? marka(k.enUcuz.market).ad : 'Fiyat bulunamadı'
      if (!map.has(ad)) map.set(ad, { ad, kalemler: [], toplam: 0, fiyatYok: !k.enUcuz })
      const g = map.get(ad)
      g.kalemler.push(k)
      if (k.enUcuz) g.toplam += k.enUcuz.price * k.adet
    }
    return [...map.values()].sort((a, b) => (a.fiyatYok - b.fiyatYok) || (b.kalemler.length - a.kalemler.length) || (a.toplam - b.toplam))
  }, [h])

  if (!store.sepet.length) {
    return (
      <div className="space-y-4">
        <div className="text-center py-10 text-base-content/50 space-y-3">
          <ShoppingCart size={40} className="mx-auto opacity-40" />
          <p className="text-sm">Sepetin boş. Bir ürünü açıp "Sepete ekle" de.</p>
          <a href="#/" className="btn btn-primary btn-sm">Ürünlere göz at</a>
        </div>
        {/* Akıllı Sepet'e yönlendir — kayıtlı listeler orada */}
        <button
          onClick={onAkilli}
          className="w-full text-left rounded-2xl p-4 bg-gradient-to-br from-secondary/15 to-primary/10 border border-secondary/25 flex items-center gap-3 hover:from-secondary/25 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-secondary text-secondary-content grid place-items-center shrink-0"><Wand2 size={20} /></div>
          <div className="flex-1">
            <div className="font-semibold">Akıllı Sepet'e geç</div>
            <div className="text-xs text-base-content/60">Kayıtlı listelerin burada. Tek dokunuşla en ucuzları getir.</div>
          </div>
          <span className="text-secondary font-bold">→</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShoppingCart size={20} /> Sepetim
          <span className="badge badge-primary">{h.toplamAdet}</span>
        </h1>
        <button onClick={sepetiBosalt} className="btn btn-ghost btn-xs text-base-content/50">Temizle</button>
      </div>

      {!user && (
        <div className="alert text-xs">
          Sepetin şu an bu cihazda tutuluyor. <a href="#/giris" className="link link-primary">Giriş yap</a> ki her cihazdan görebilesin.
        </div>
      )}

      {/* ÖZET: nasıl alırsan ucuz */}
      <div className="grid grid-cols-1 gap-2">
        {/* Firma firma: tek yerden alırsan */}
        {h.marketler?.length > 0 && (
          <div className="bg-base-100 border border-base-300 rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold"><Store size={16} className="text-primary" /> Market market (tek yerden al)</div>
            <div className="space-y-1.5">
              {h.marketler.slice(0, 8).map((m, i) => (
                <div key={m.ad} className={`flex items-center gap-2 rounded-xl p-2 ${i === 0 ? 'bg-primary/10 border border-primary/25' : 'bg-base-200/40'}`}>
                  <MarketBadge market={m.ad} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">{m.kapsanan}/{h.kalemler.length} ürün var</div>
                    {m.tumVar
                      ? <div className="text-[10px] text-success">tüm sepet bu markette ✓</div>
                      : <div className="text-[10px] text-base-content/50">{m.eksik} ürün burada yok</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-primary leading-none">{tl(m.total)}</div>
                    {i === 0 && <div className="text-[10px] text-secondary mt-0.5">en çok bulunan</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-base-content/50 leading-snug">Fiyatlar o markette bulunan ürünler içindir. Tümünü en ucuza toplamak için aşağıdaki dağıtımı kullan.</div>
          </div>
        )}

        <div className="bg-base-100 border border-base-300 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-sm text-base-content/60"><Trophy size={16} className="text-secondary" /> Her ürünü en ucuzdan al</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-base-content/50">{h.cherryTamMi ? 'firma firma dağıtım aşağıda' : 'bazı ürünlerde fiyat yok'}</span>
            <div className="text-2xl font-extrabold text-primary">{tl(h.cherryTotal)}</div>
          </div>
          {h.tasarruf > 0 && (
            <div className="text-xs text-secondary font-semibold mt-1">
              Tek markete göre {tl(h.tasarruf)} daha ucuz (biraz gezmek gerekir)
            </div>
          )}
        </div>
      </div>

      {/* KALEMLER: firmaya göre gruplu — hangi markette ne alınacak */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-base-content/60 px-1">En ucuz alışveriş — market market</div>
        {gruplar.map((g) => (
          <div key={g.ad} className="rounded-2xl border border-base-300 overflow-hidden">
            {/* Firma başlığı */}
            <div className={`flex items-center gap-2 px-3 py-2 ${g.fiyatYok ? 'bg-base-200' : 'bg-primary/10'}`}>
              {g.fiyatYok ? <span className="text-sm font-semibold text-base-content/50">Fiyat bulunamadı</span> : <MarketBadge market={g.ad} size="sm" />}
              <span className="text-xs text-base-content/60">{g.kalemler.length} ürün</span>
              {!g.fiyatYok && <span className="ml-auto font-bold text-primary">{tl(g.toplam)}</span>}
            </div>
            {/* Firma ürünleri */}
            <div className="divide-y divide-base-200">
              {g.kalemler.map((k) => (
                <div key={k.id} className="bg-base-100 p-3 flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-lg bg-base-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {k.gorsel ? <img src={k.gorsel} alt="" className="w-full h-full object-contain" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium leading-tight line-clamp-2">{k.baslik}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {k.enUcuz
                        ? <><span className="text-sm font-bold text-primary">{tl(k.enUcuz.price)}</span><span className="text-[11px] text-base-content/40">/ adet</span></>
                        : <span className="text-xs text-base-content/40">fiyat bulunamadı</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => adetDegistir(k.id, k.adet - 1)} className="btn btn-xs btn-circle btn-outline"><Minus size={12} /></button>
                      <span className="text-sm w-6 text-center font-medium">{k.adet}</span>
                      <button onClick={() => adetDegistir(k.id, k.adet + 1)} className="btn btn-xs btn-circle btn-outline"><Plus size={12} /></button>
                      <button onClick={() => sepettenCikar(k.id)} className="btn btn-ghost btn-xs btn-circle text-base-content/40 ml-auto"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {k.enUcuz && <div className="font-bold">{tl(k.enUcuz.price * k.adet)}</div>}
                    <div className="text-[11px] text-base-content/40">{k.adet} adet</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_PRODUCT} />
      <p className="text-[11px] text-base-content/40 text-center">
        Fiyatlar ürünü sepete eklediğin andaki marketfiyati.org.tr verisine dayanır.
      </p>
    </div>
  )
}

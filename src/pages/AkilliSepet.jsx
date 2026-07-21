import { useState, useSyncExternalStore } from 'react'
import { Wand2, Plus, Trash2, Loader2, ShoppingCart, Ban, Store, Trophy, Save, FolderOpen, Bookmark, ListPlus, Tag, Coins } from 'lucide-react'
import {
  subscribe, getSnapshot, urunEkle, topluEkle, urunSil, adetDegistir, birimDegistir,
  sepetiOlustur, markaIstemeVeYenidenSec, urunIstemeVeYenidenSec, sonucuTemizle,
  listeKaydet, listeAc, listeSilId, kalemDegistir,
} from '../lib/akilliSepet'
import { listeyiAyristir } from '../lib/gemini'
import { getSnapshot as storeSnapshot, sepeteEkle } from '../lib/store'
import { tl } from '../lib/format'
import MarketBadge from '../components/MarketBadge'
import AiAsistan from '../components/AiAsistan'

// Küçük adım rozeti (1, 2, 3) — akışı netleştirir.
function Adim({ n, baslik, sag }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-primary text-primary-content text-xs font-bold grid place-items-center shrink-0">{n}</span>
      <h3 className="font-semibold flex-1">{baslik}</h3>
      {sag}
    </div>
  )
}

export default function AkilliSepet({ onSelect, user }) {
  const s = useSyncExternalStore(subscribe, getSnapshot)
  const [giris, setGiris] = useState('')
  const [ayristiriliyor, setAyristiriliyor] = useState(false)
  const [ekleniyor, setEkleniyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [kaydetAcik, setKaydetAcik] = useState(false)
  const [listeAdi, setListeAdi] = useState('')
  const [acilan, setAcilan] = useState(null) // getiriliyor olan liste id

  // Tek kutu: virgül/satır varsa çoklu ayrıştır, yoksa tek ürün ekle.
  async function ekle(e) {
    e?.preventDefault()
    const t = giris.trim()
    if (!t) return
    setMesaj('')
    if (/[,;\n]/.test(t)) {
      setAyristiriliyor(true)
      try {
        const { items } = await listeyiAyristir(t)
        if (items.length) { topluEkle(items); setGiris('') }
        else setMesaj('Liste anlaşılamadı, tek tek eklemeyi dene.')
      } finally { setAyristiriliyor(false) }
    } else {
      urunEkle(t); setGiris('')
    }
  }

  async function olustur(mod) {
    setMesaj('')
    await sepetiOlustur(storeSnapshot().konum, mod)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }
  // Birim döngüsü: adet → kg → lt → adet
  const BIRIMLER = ['adet', 'kg', 'lt']
  const birimSonraki = (b) => BIRIMLER[(BIRIMLER.indexOf(b || 'adet') + 1) % BIRIMLER.length]

  async function kaydet() {
    try {
      const k = await listeKaydet(listeAdi)
      setKaydetAcik(false); setListeAdi(''); setMesaj(`"${k.ad}" listen kaydedildi.`)
    } catch (e) { setMesaj(e.message) }
  }

  // Kayıtlı listeyi aç ve en ucuzları getir
  async function listeGetir(id) {
    setAcilan(id)
    listeAc(id)
    await sepetiOlustur(storeSnapshot().konum)
    setAcilan(null)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  async function hepsiniSepeteEkle() {
    if (!s.sonuc?.kalemler?.length) return
    setEkleniyor(true)
    try {
      for (const k of s.sonuc.kalemler) await sepeteEkle(k.urun, k.adet)
      // Sepetim sekmesine geç
      window.location.hash = '#/sepet'
    } finally { setEkleniyor(false) }
  }

  const sonuc = s.sonuc
  const listeVar = s.liste.length > 0

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex items-start gap-2">
        <Wand2 className="text-secondary mt-0.5" />
        <div>
          <h2 className="text-lg font-bold leading-tight">Akıllı Sepet</h2>
          <p className="text-sm text-base-content/60">Listeni oluştur, tek dokunuşla her ürünün <b>en ucuz yerini</b> bulalım.</p>
        </div>
      </div>

      {/* KAYITLI LİSTELER — en üstte, net. Buradan tek tuşla en ucuzları getir. */}
      {s.listelerim?.length > 0 && (
        <section className="bg-primary/5 border border-primary/20 rounded-2xl p-3 space-y-2.5">
          <div className="text-sm font-semibold flex items-center gap-1.5"><Bookmark size={16} className="text-primary" /> Kayıtlı listelerim</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {s.listelerim.map((l) => (
              <div key={l.id} className="bg-base-100 border border-base-300 rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold leading-snug break-words">{l.ad}</div>
                    <div className="text-[11px] text-base-content/50">{l.urunler?.length || 0} ürün</div>
                  </div>
                  <button onClick={() => listeSilId(l.id)} className="btn btn-ghost btn-xs btn-circle text-base-content/40 shrink-0" title="Listeyi sil"><Trash2 size={14} /></button>
                </div>
                <button onClick={() => listeGetir(l.id)} disabled={acilan === l.id} className="btn btn-primary btn-sm w-full">
                  {acilan === l.id ? <><Loader2 size={14} className="animate-spin" /> Bulunuyor</> : <><FolderOpen size={14} /> En ucuzları getir</>}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ADIM 1 — Listeni oluştur */}
      <section className="space-y-2.5">
        <Adim n={1} baslik="Listeni oluştur" />

        {/* AI asistan (hazır öneriler + serbest soru) */}
        <AiAsistan />

        {/* Tek akıllı kutu: tek ürün veya virgülle birden çok */}
        <form onSubmit={ekle} className="flex gap-2">
          <input
            value={giris}
            onChange={(e) => setGiris(e.target.value)}
            placeholder="Ürün yaz — birden çoğu virgülle: süt, ekmek, deterjan"
            className="input input-bordered flex-1"
          />
          <button type="submit" disabled={ayristiriliyor} className="btn btn-secondary">
            {ayristiriliyor ? <Loader2 size={18} className="animate-spin" /> : <ListPlus size={18} />}
            <span className="hidden sm:inline">Ekle</span>
          </button>
        </form>
      </section>

      {mesaj && <div className="alert text-sm py-2">{mesaj}</div>}

      {/* ADIM 2 — Listen */}
      <section className="space-y-2.5">
        <Adim
          n={2}
          baslik={`Listen${listeVar ? ` (${s.liste.length})` : ''}`}
          sag={listeVar && <button onClick={() => setKaydetAcik((v) => !v)} className="btn btn-ghost btn-xs"><Save size={14} /> Kaydet</button>}
        />

        {kaydetAcik && listeVar && (
          <div className="flex gap-2">
            <input value={listeAdi} onChange={(e) => setListeAdi(e.target.value)} placeholder="Liste adı (ör. Aylık market)" className="input input-bordered input-sm flex-1" />
            <button onClick={kaydet} className="btn btn-primary btn-sm">Kaydet</button>
          </div>
        )}

        {listeVar ? (
          <div className="space-y-2">
            {s.liste.map((it) => (
              <div key={it.id} className="bg-base-100 border border-base-300 rounded-xl p-2.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium leading-tight">{it.terim}</div>
                  {(it.istenmeyenMarkalar?.length > 0 || it.tercihMarka) && (
                    <div className="text-[11px] text-base-content/50">
                      {it.tercihMarka && <>tercih: {it.tercihMarka} </>}
                      {it.istenmeyenMarkalar?.length > 0 && <>· istemez: {it.istenmeyenMarkalar.join(', ')}</>}
                    </div>
                  )}
                </div>
                {(() => {
                  const birim = it.birim || 'adet'
                  const tartili = birim !== 'adet'
                  const step = tartili ? 0.5 : 1
                  return (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => adetDegistir(it.id, +(it.adet - step).toFixed(2))} className="btn btn-xs btn-circle btn-ghost">−</button>
                        <span className="min-w-[2rem] text-center text-sm font-medium">{it.adet}</span>
                        <button onClick={() => adetDegistir(it.id, +(it.adet + step).toFixed(2))} className="btn btn-xs btn-circle btn-ghost">+</button>
                      </div>
                      <button
                        onClick={() => birimDegistir(it.id, birimSonraki(birim))}
                        title="Birimi değiştir (adet / kg / lt)"
                        className="btn btn-xs btn-outline min-w-[3rem] font-semibold"
                      >
                        {birim} ⇄
                      </button>
                    </div>
                  )
                })()}
                <button onClick={() => urunSil(it.id)} className="btn btn-ghost btn-xs btn-circle text-base-content/40"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-base-content/50 bg-base-100 border border-dashed border-base-300 rounded-2xl py-6 px-4">
            Listen boş. Yukarıdan bir <b>hazır öneri</b> seç ya da ürün yazıp ekle.
          </div>
        )}
      </section>

      {/* ADIM 3 — Sepetini oluştur (en ucuz / avantajlı) */}
      {listeVar && (
        <section className="space-y-2.5">
          <Adim n={3} baslik="Sepetini oluştur" />
          {s.olusturuluyor ? (
            <button disabled className="btn btn-primary btn-lg w-full">
              <Loader2 size={20} className="animate-spin" /> Bulunuyor...
            </button>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button onClick={() => olustur('ucuz')} className="btn btn-primary btn-lg shadow-lg shadow-primary/20">
                <Coins size={20} /> En ucuz sepet
              </button>
              <button onClick={() => olustur('avantajli')} className="btn btn-lg bg-secondary text-secondary-content border-0 shadow-lg shadow-secondary/20 hover:brightness-95">
                <Tag size={20} /> Avantajlı sepet
              </button>
            </div>
          )}
          <p className="text-[11px] text-base-content/50 text-center">
            <b>En ucuz:</b> en düşük etiketli paket · <b>Avantajlı:</b> kiloda/litrede en hesaplı (birim fiyat)
          </p>
        </section>
      )}

      {/* SONUÇ */}
      {sonuc && (
        <div className="space-y-3 pt-1">
          {/* Seçim modu: en ucuz paket ↔ birim fiyatı en avantajlı */}
          <div className="flex bg-base-200 rounded-xl p-1 gap-1 text-xs">
            <button
              onClick={() => olustur('ucuz')}
              disabled={s.olusturuluyor}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium ${sonuc.mod !== 'avantajli' ? 'bg-base-100 shadow text-primary' : 'text-base-content/60'}`}
            >
              <Coins size={14} /> En ucuz paket
            </button>
            <button
              onClick={() => olustur('avantajli')}
              disabled={s.olusturuluyor}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium ${sonuc.mod === 'avantajli' ? 'bg-secondary text-secondary-content shadow' : 'text-secondary bg-secondary/10'}`}
            >
              <Tag size={14} /> En avantajlı (birim fiyat)
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {sonuc.hesap.marketler?.length > 0 && (() => {
              const toplam = sonuc.kalemler.length
              const liste = sonuc.hesap.marketler.slice(0, 8)
              return (
                <div className="bg-base-100 border border-base-300 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Store size={16} className="text-primary" /> Market market (tek yerden al)</div>
                  <div className="space-y-1.5">
                    {liste.map((m, i) => (
                      <div key={m.ad} className={`flex items-center gap-2 rounded-xl p-2 ${i === 0 ? 'bg-primary/10 border border-primary/25' : 'bg-base-200/40'}`}>
                        <MarketBadge market={m.ad} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium">{m.kapsanan}/{toplam} ürün var</div>
                          {!m.tumVar && <div className="text-[10px] text-base-content/50">{m.eksik} ürün burada yok</div>}
                          {m.tumVar && <div className="text-[10px] text-success">tüm liste bu markette ✓</div>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-primary leading-none">{tl(m.total)}</div>
                          {i === 0 && <div className="text-[10px] text-secondary mt-0.5">en çok bulunan</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-base-content/50 leading-snug">
                    Fiyatlar, o markette <b>bulunan</b> ürünler içindir; eksikleri başka yerden alman gerekir. Tüm listeyi en ucuza toplamak için aşağıdaki <b>“Her ürünü en ucuzdan al”</b>.
                  </div>
                </div>
              )
            })()}
            <div className="bg-base-100 border border-base-300 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm text-base-content/60"><Trophy size={16} className="text-secondary" /> Her ürünü en ucuzdan al</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-base-content/50">{sonuc.kalemler.length} ürün bulundu</span>
                <div className="text-2xl font-extrabold text-primary">{tl(sonuc.hesap.cherryTotal)}</div>
              </div>
              {sonuc.hesap.tasarruf > 0 && <div className="text-xs text-secondary font-semibold mt-1">Tek markete göre {tl(sonuc.hesap.tasarruf)} daha ucuz</div>}
            </div>
          </div>

          <div className="space-y-2">
            {sonuc.kalemler.map((k) => (
              <div key={k.listeId} className="bg-base-100 border border-base-300 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center gap-3">
                  <button onClick={() => onSelect?.(k.urun)} className="w-11 h-11 rounded-lg bg-base-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {k.urun.imageUrl ? <img src={k.urun.imageUrl} alt="" className="w-full h-full object-contain" /> : null}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-base-content/40">
                      {k.terim} — istenen {k.istenen ?? k.adet}{k.birim && k.birim !== 'adet' ? ` ${k.birim}` : ' adet'}
                      {(k.birim === 'kg' || k.birim === 'lt') && <span className="text-secondary"> · {k.adet} paket alınır</span>}
                    </div>
                    <div className="font-medium leading-tight line-clamp-1">{k.urun.title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {k.urun.cheapest && <MarketBadge market={k.urun.cheapest.market} size="sm" />}
                      <span className="text-sm font-bold text-primary">{tl(k.urun.minPrice)}</span>
                      {k.adet > 1 && <span className="text-[11px] text-base-content/50">× {k.adet} = <b>{tl(k.urun.minPrice * k.adet)}</b></span>}
                      {k.urun.birimFiyat != null && (
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${sonuc.mod === 'avantajli' ? 'bg-secondary/15 text-secondary font-semibold' : 'text-base-content/50'}`}>
                          {tl(k.urun.birimFiyat)}/{k.urun.birimAdi || 'br'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="dropdown dropdown-end shrink-0">
                    <button tabIndex={0} role="button" className="btn btn-ghost btn-xs text-error hover:bg-error/10">
                      <Ban size={14} /> istemem
                    </button>
                    <div tabIndex={0} className="dropdown-content z-20 mt-1 w-64 rounded-2xl bg-base-100 border border-base-300 shadow-xl p-2 space-y-1">
                      <div className="px-2 py-1 text-[11px] text-base-content/50">
                        Neden istemiyorsun? Seçtiğin <b>bir daha önerilmez</b>.
                      </div>
                      <button
                        onClick={(e) => {
                          e.currentTarget.blur()
                          const konum = storeSnapshot().konum
                          if (k.urun.brand) markaIstemeVeYenidenSec(k.listeId, k.urun.brand, konum)
                          else urunIstemeVeYenidenSec(k.listeId, k.urun.id, konum)
                        }}
                        className="w-full text-left rounded-xl p-2 hover:bg-base-200 text-sm"
                      >
                        <div className="font-medium flex items-center gap-1.5"><Store size={14} className="text-primary" /> Başka marka öner</div>
                        <div className="text-[11px] text-base-content/50">{k.urun.brand ? `"${k.urun.brand}" markası` : 'Bu ürün'} bir daha gelmez, farklısı seçilir.</div>
                      </button>
                      <button
                        onClick={(e) => { e.currentTarget.blur(); urunIstemeVeYenidenSec(k.listeId, k.urun.id, storeSnapshot().konum) }}
                        className="w-full text-left rounded-xl p-2 hover:bg-error/10 text-sm text-error"
                      >
                        <div className="font-medium flex items-center gap-1.5"><Ban size={14} /> Bu ürünü hiç gösterme</div>
                        <div className="text-[11px] opacity-70">Bu ürün ("{k.urun.title?.slice(0, 30)}") listende bir daha çıkmaz.</div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Avantajlı öneri: birim fiyatı daha iyi bir paket varsa (ör. 5'li) */}
                {k.avantajli && (
                  <button
                    onClick={() => kalemDegistir(k.listeId, k.avantajli)}
                    className="w-full text-left rounded-lg bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 px-2.5 py-1.5 flex items-center gap-2"
                  >
                    <Tag size={14} className="text-secondary shrink-0" />
                    <span className="text-[11px] leading-tight flex-1 min-w-0">
                      <b className="text-secondary">Daha avantajlı:</b> {k.avantajli.title}
                      <span className="text-base-content/50"> — {tl(k.avantajli.birimFiyat)}/{k.avantajli.birimAdi || 'br'} · paket {tl(k.avantajli.minPrice)}</span>
                    </span>
                    <span className="text-[11px] font-bold text-secondary shrink-0">bunu al →</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {sonuc.bulunamayan?.length > 0 && <div className="alert alert-warning text-xs py-2">Bulunamadı: {sonuc.bulunamayan.join(', ')}</div>}

          <div className="flex gap-2">
            <button onClick={hepsiniSepeteEkle} disabled={ekleniyor} className="btn btn-primary flex-1">
              {ekleniyor ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />} Hepsini sepete ekle
            </button>
            <button onClick={sonucuTemizle} className="btn btn-ghost">Kapat</button>
          </div>
          <p className="text-[11px] text-base-content/40 text-center">Tercihlerin hatırlanır: istemediğin marka ya da ürün bir daha karşına çıkmaz.</p>
        </div>
      )}
    </div>
  )
}

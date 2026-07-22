import { useState, useSyncExternalStore } from 'react'
import { Bot, Send, Plus, Loader2, X, Store } from 'lucide-react'
import { oneriAl } from '../lib/gemini'
import { yerelOneri, urunOnerileri, ekstraOneriler } from '../lib/oneriler'
import { subscribe, getSnapshot, topluEkle, yeniListeOlustur } from '../lib/akilliSepet'
import { getAuth } from '../lib/auth'
import { girisIste } from '../lib/girisKapisi'

const HIZLI = [
  'Aylık market alışverişi listesi',
  'Haftalık ekonomik sepet öner',
  '4 kişilik kahvaltı listesi',
  'Bebekli ev için temel ihtiyaçlar',
  'Ucuz akşam yemeği malzemeleri',
  'Aylık temizlik ve kağıt ürünleri',
  'Öğrenci evi için temel gıda',
  'Kahvaltılık ürünler',
  'Sağlıklı/diyet beslenme sepeti',
  'Bakliyat ve kışlık erzak',
  'Misafir için ikramlık',
  'Bebek bakım ürünleri',
]

// İşletme / toplu alım önerileri (restoran, kafe, pastane, büfe, otel, ofis)
const ISLETME_HIZLI = [
  'Restoran / lokanta malzemeleri',
  'Kafe için malzeme listesi',
  'Pastane / fırın malzemeleri',
  'Büfe / kantin ürünleri',
  'Otel / pansiyon kahvaltısı',
  'Ofis / işyeri mutfağı',
]

// Öneri cevabından liste adı türet ("aylık market" → "Aylık market listesi").
function listeAdiYap(sohbet, soru) {
  const ham = (sohbet?.ad || soru || 'Alışveriş').trim()
  const bas = ham.charAt(0).toLocaleUpperCase('tr') + ham.slice(1)
  return /liste/i.test(bas) ? bas : `${bas} listesi`
}

// Konuşan AI asistan — hem ana sayfada hem Akıllı Sepet'te kullanılır.
// yeniListe=true → "listeye ekle" yeni bir adlandırılmış liste oluşturup Sepet'e gider.
export default function AiAsistan({ yeniListe = false }) {
  const s = useSyncExternalStore(subscribe, getSnapshot)
  const [soru, setSoru] = useState('')
  const [soruyor, setSoruyor] = useState(false)
  const [sohbet, setSohbet] = useState(null)
  const [eklendi, setEklendi] = useState(false)
  const [ekstra, setEkstra] = useState('')

  async function sor(metin) {
    const q = (metin ?? soru).trim()
    if (!q) return
    setSoru(q); setSoruyor(true); setSohbet(null); setEklendi(false)
    // Önce yerel (ücretsiz, anında) motor — yaygın istekler kotasız çalışır.
    const yerel = yerelOneri(q)
    if (yerel) { setSohbet(yerel); setSoruyor(false); return }
    // Kalıba uymayan özel sorular Gemini'ye gider (varsa).
    const cevap = await oneriAl(q, s.liste.map((x) => x.terim))
    setSohbet(cevap)
    setSoruyor(false)
  }
  async function ekle(items) {
    if (yeniListe) {
      // Ana sayfa: yeni adlandırılmış liste oluştur + Sepet'e git. (Giriş gerekir)
      if (!getAuth().user) { girisIste('liste oluşturmak'); return }
      const ad = listeAdiYap(sohbet, soru)
      await yeniListeOlustur(ad, items)
      setEklendi(true); setSohbet(null); setSoru('')
      window.location.hash = '#/sepet/akilli'
      return
    }
    topluEkle(items)
    setEklendi(true); setSohbet(null); setSoru('')
  }
  // Beğenilmeyen ürünü öneri listesinden çıkar (eklemeden önce).
  function cikar(i) {
    setSohbet((o) => (o ? { ...o, items: o.items.filter((_, k) => k !== i) } : o))
  }
  // Öneriye kendi ürününü ekle (listeyi oluşturmadan önce). terim verilirse onu ekler.
  function ekstraEkle(e, terim) {
    e?.preventDefault()
    const t = (terim ?? ekstra).trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr')
    if (!t) return
    setSohbet((o) => {
      if (!o) return o
      const varMi = o.items.some((it) => it.terim.toLocaleLowerCase('tr') === t.toLocaleLowerCase('tr'))
      if (varMi) return o
      return { ...o, items: [...o.items, { terim: t, adet: 1, marka: null }] }
    })
    setEkstra('')
  }
  const yaziyor = ekstra.trim().length >= 2
  const ipuclari = yaziyor ? urunOnerileri(ekstra) : []
  const tamamlayici = !yaziyor && sohbet?.items ? ekstraOneriler(sohbet.items.map((i) => i.terim)) : []

  return (
    <div className="rounded-2xl p-3 space-y-3 bg-gradient-to-br from-secondary/10 to-primary/10 border border-secondary/20">
      <div className="flex items-center gap-1.5 text-sm font-semibold"><Bot size={16} className="text-secondary" /> Yapay zekâ asistan — ne almak istersin?</div>
      <form onSubmit={(e) => { e.preventDefault(); sor() }} className="flex gap-2">
        <input value={soru} onChange={(e) => setSoru(e.target.value)} placeholder="örn: 4 kişilik aylık ekonomik sepet öner" className="input input-bordered input-sm flex-1 bg-base-100" />
        <button type="submit" disabled={soruyor} className="btn btn-secondary btn-sm">
          {soruyor ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {HIZLI.map((h) => (
          <button key={h} onClick={() => sor(h)} disabled={soruyor} className="badge badge-outline badge-sm hover:badge-secondary cursor-pointer py-2">{h}</button>
        ))}
      </div>

      {/* İşletme / toplu alım önerileri */}
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-base-content/50 pt-0.5">
        <Store size={12} className="text-secondary" /> İşletme / toplu alım
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ISLETME_HIZLI.map((h) => (
          <button key={h} onClick={() => sor(h)} disabled={soruyor} className="badge badge-outline badge-sm hover:badge-primary hover:text-primary-content cursor-pointer py-2">{h}</button>
        ))}
      </div>

      {soruyor && <div className="text-xs text-base-content/50 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> asistan düşünüyor (ilk seferde biraz sürebilir)...</div>}

      {eklendi && (
        <div className="text-xs bg-success/10 text-success rounded-xl p-2.5">
          Öneriler <b>Akıllı Sepet</b> listene eklendi. <a href="#/sepet" className="link">Listeye git →</a>
        </div>
      )}
      {sohbet?.yok && (
        <div className="text-xs bg-base-100 rounded-xl p-2.5 text-base-content/70">
          Bu özel istek için yapay zekâ gerekiyor. Yukarıdaki <b>hazır öneriler</b> (kahvaltı, aylık market, temizlik…) ise <b>ücretsiz ve anında</b> çalışır — birine dokun.
        </div>
      )}
      {sohbet?.kota && (
        <div className="text-xs bg-warning/15 text-warning-content rounded-xl p-2.5 space-y-1">
          <div>⏳ Serbest yazılan istekler için yapay zekâ kotası şu an dolu. Ama yukarıdaki <b>hazır öneri düğmeleri kotasız çalışır</b> — birine dokunarak hemen liste oluşturabilirsin.</div>
        </div>
      )}
      {sohbet?.hata && (
        <div className="text-xs bg-warning/15 text-warning-content rounded-xl p-2.5 space-y-1">
          <div>Bu özel istek şu an işlenemedi. Yukarıdaki <b>hazır öneriler kotasız ve anında</b> çalışır — birine dokun.</div>
        </div>
      )}
      {sohbet?.reply != null && !sohbet.yok && !sohbet.hata && (
        <div className="space-y-2">
          <div className="bg-base-100 rounded-xl p-2.5 text-sm flex gap-2">
            <Bot size={16} className="text-secondary shrink-0 mt-0.5" />
            <div>
              <span>{sohbet.reply || 'Önerilerim:'}</span>
              {sohbet.model && <span className="block text-[10px] text-base-content/40 mt-1">model: {sohbet.model} — hız için .env'e GEMINI_MODEL={sohbet.model} ekle</span>}
            </div>
          </div>
          {sohbet.items?.length > 0 && (
            <>
              <div className="text-[10px] text-base-content/40">İstemediğin ürünün <b>×</b> işaretine dokun, listeden çıkar.</div>
              <div className="flex flex-wrap gap-1.5">
                {sohbet.items.map((it, i) => (
                  <button
                    key={i}
                    onClick={() => cikar(i)}
                    title="Listeden çıkar"
                    className="badge badge-secondary badge-outline gap-1 py-2.5 pr-1.5 cursor-pointer hover:badge-error hover:line-through group"
                  >
                    {it.adet > 1 && <b>{it.adet}×</b>} {it.terim}
                    <X size={13} className="opacity-50 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
              <div className="rounded-xl border-2 border-dashed border-secondary/40 bg-base-100 p-2.5 space-y-2">
                <div className="text-xs font-semibold text-secondary flex items-center gap-1.5"><Plus size={14} /> Başka ürün eklemek ister misin?</div>
                <form onSubmit={ekstraEkle} className="flex gap-1.5">
                  <input
                    value={ekstra}
                    onChange={(e) => setEkstra(e.target.value)}
                    placeholder="Ürün yaz (ör. helva, peynir, yağ...)"
                    className="input input-bordered input-sm flex-1"
                  />
                  <button type="submit" className="btn btn-secondary btn-sm"><Plus size={16} /> Ekle</button>
                </form>
                {ipuclari.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-base-content/50">Bunu mu demek istedin? Dokun, doğru ürünü ekle:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {ipuclari.map((o) => (
                        <button key={o} onClick={(e) => ekstraEkle(e, o)} className="badge badge-outline badge-secondary badge-sm cursor-pointer py-2 hover:badge-secondary">+ {o}</button>
                      ))}
                    </div>
                  </div>
                )}
                {tamamlayici.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-base-content/50">Bunlar da lazım olabilir:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {tamamlayici.map((o) => (
                        <button key={o} onClick={(e) => ekstraEkle(e, o)} className="badge badge-outline badge-sm cursor-pointer py-2 hover:badge-secondary hover:text-secondary-content">+ {o}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => ekle(sohbet.items)} className="btn btn-secondary btn-sm w-full">
                <Plus size={16} /> {yeniListe
                  ? `"${listeAdiYap(sohbet, soru)}" oluştur ve Sepet'e git (${sohbet.items.length} ürün)`
                  : `Bu ${sohbet.items.length} ürünü listeme ekle`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { BellRing, Send, Loader2, Megaphone, Tag, Users, Check, RefreshCw, History } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Tıklanınca gidilecek hazır hedefler (uygulama içi) + dış bağlantı seçeneği
const HEDEFLER = [
  { v: '', ad: 'Bildirimler sayfası (varsayılan)' },
  { v: '/#/', ad: 'Ana sayfa' },
  { v: '/#/sepet', ad: 'Akıllı Sepet' },
  { v: '/#/favoriler', ad: 'Favoriler' },
  { v: '/#/giris', ad: 'Hesabım / Giriş' },
  { v: '/#/reklam-ver', ad: 'Reklam Ver sayfası' },
  { v: '__dis__', ad: 'Dış bağlantı (kendi linkim)…' },
]

function zamanKisa(iso) {
  try {
    const fark = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
    if (fark < 60) return 'az önce'
    if (fark < 3600) return Math.floor(fark / 60) + ' dk önce'
    if (fark < 86400) return Math.floor(fark / 3600) + ' saat önce'
    if (fark < 604800) return Math.floor(fark / 86400) + ' gün önce'
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

// Admin: toplu push duyurusu + gönderilen bildirim raporu.
export default function BildirimYonetimi() {
  const [baslik, setBaslik] = useState('')
  const [mesaj, setMesaj] = useState('')
  const [hedef, setHedef] = useState('')       // seçilen hazır hedef ('' = varsayılan)
  const [disUrl, setDisUrl] = useState('')     // "dış bağlantı" seçilince URL
  const [bekle, setBekle] = useState(false)
  const [sonuc, setSonuc] = useState(null)
  const [hata, setHata] = useState('')
  const [abone, setAbone] = useState(null)
  const [gecmis, setGecmis] = useState(null)
  const [acan, setAcan] = useState({})        // bildirim id → açan tekil kişi sayısı
  const [filtre, setFiltre] = useState('hepsi')

  async function aboneSay() {
    try {
      const { count } = await supabase.from('push_abonelikleri').select('id', { count: 'exact', head: true })
      setAbone(count ?? 0)
    } catch { setAbone(null) }
  }
  async function gecmisYukle() {
    try {
      const { data, error } = await supabase
        .from('bildirimler')
        .select('id,baslik,govde,tur,gonderildi,toplam,created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      setGecmis(error ? [] : (data || []))
    } catch { setGecmis([]) }
  }
  // "açıldı" olaylarından her bildirimi kaç tekil kişinin açtığını hesapla
  async function acanYukle() {
    try {
      const { data } = await supabase.from('olaylar').select('ziyaretci_id,detay').eq('tur', 'bildirim_acildi').limit(20000)
      const map = {}
      for (const o of (data || [])) {
        const id = o?.detay?.id
        if (!id) continue
        ;(map[id] = map[id] || new Set()).add(o.ziyaretci_id)
      }
      const say = {}
      for (const k of Object.keys(map)) say[k] = map[k].size
      setAcan(say)
    } catch { setAcan({}) }
  }
  useEffect(() => { aboneSay(); gecmisYukle(); acanYukle() }, [])

  async function gonder(e) {
    e.preventDefault()
    setBekle(true); setHata(''); setSonuc(null)
    // Tıklama hedefini hesapla
    let url = hedef
    if (hedef === '__dis__') {
      url = disUrl.trim()
      if (!/^https?:\/\//i.test(url)) { setHata('Dış bağlantı https:// ile başlamalı.'); setBekle(false); return }
    }
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) { setHata('Oturum bulunamadı, tekrar giriş yap.'); setBekle(false); return }
      const r = await fetch('/api/push-gonder', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
        body: JSON.stringify({ baslik: baslik.trim(), mesaj: mesaj.trim(), url }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        setHata(
          j.error === 'yapilandirma_eksik' ? 'Sunucuda VAPID_PRIVATE_JWK ayarı eksik (Cloudflare env).'
            : j.error === 'yetki_yok' ? 'Yetki doğrulanamadı (admin oturumu gerekiyor).'
              : 'Gönderilemedi (' + (j.error || r.status) + ').',
        )
      } else {
        setSonuc(j)
        setBaslik(''); setMesaj(''); setHedef(''); setDisUrl('')
        gecmisYukle(); aboneSay(); acanYukle()
      }
    } catch (err) {
      setHata('Gönderilemedi. ' + (err.message || ''))
    } finally { setBekle(false) }
  }

  const gonderilebilir = !bekle && (baslik.trim() || mesaj.trim())

  return (
    <div className="space-y-4">
      {/* Başlık şeridi */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary grid place-items-center"><BellRing size={19} /></div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Bildirimler</h1>
            <p className="text-[12px] text-base-content/50">Tüm abonelere toplu push gönder ve geçmişi takip et.</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-extrabold tabular-nums leading-none">{abone == null ? '—' : abone}</div>
          <div className="text-[11px] text-base-content/50 flex items-center gap-1 justify-end"><Users size={12} /> abone cihaz</div>
        </div>
      </div>

      {/* COMPOSER */}
      <section className="bg-base-100 border border-base-300 rounded-3xl p-4 sm:p-5">
        <form onSubmit={gonder} className="grid md:grid-cols-2 gap-4">
          {/* Sol: alanlar */}
          <div className="space-y-2.5">
            <label className="block">
              <span className="text-[11px] font-semibold text-base-content/60">Başlık</span>
              <input value={baslik} onChange={(e) => setBaslik(e.target.value)} maxLength={60}
                placeholder="🔥 Bugün süt çok ucuz!" className="input input-bordered w-full mt-1" />
              <span className="text-[10px] text-base-content/40">{baslik.length}/60</span>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-base-content/60">Mesaj</span>
              <textarea value={mesaj} onChange={(e) => setMesaj(e.target.value)} maxLength={160} rows={3}
                placeholder="Migros ve BİM'de süt fiyatları düştü, hemen bak." className="textarea textarea-bordered w-full mt-1" />
              <span className="text-[10px] text-base-content/40">{mesaj.length}/160</span>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-base-content/60">Tıklanınca nereye gitsin?</span>
              <select value={hedef} onChange={(e) => setHedef(e.target.value)} className="select select-bordered select-sm w-full mt-1">
                {HEDEFLER.map((h) => <option key={h.v} value={h.v}>{h.ad}</option>)}
              </select>
            </label>
            {hedef === '__dis__' && (
              <label className="block">
                <span className="text-[11px] font-semibold text-base-content/60">Dış bağlantı adresi</span>
                <input value={disUrl} onChange={(e) => setDisUrl(e.target.value)} inputMode="url"
                  placeholder="https://ornek.com/kampanya" className="input input-bordered input-sm w-full mt-1" />
                <span className="text-[10px] text-base-content/40">Tıklayınca bu adres yeni sekmede/uygulamada açılır.</span>
              </label>
            )}
          </div>

          {/* Sağ: canlı önizleme + gönder */}
          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-semibold text-base-content/60">Önizleme</span>
              <div className="mt-1 rounded-2xl border border-base-300 bg-base-200/60 p-3 flex gap-3 items-start">
                <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-xl shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm leading-snug truncate">{baslik.trim() || 'Bildirim başlığı'}</div>
                  <div className="text-xs text-base-content/60 leading-snug line-clamp-3">{mesaj.trim() || 'Mesaj metni burada görünecek…'}</div>
                  <div className="text-[10px] text-base-content/40 mt-1">neredeucuz · az önce</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-primary/5 border border-primary/15 p-2.5 text-[12px] text-base-content/70">
              Bu bildirim, bildirime izin veren <b>{abone == null ? '…' : abone}</b> cihaza anında iletilir ve <b>Bildirimler</b> sayfasında geçmişe eklenir.
            </div>

            <button type="submit" disabled={!gonderilebilir} className="btn btn-primary w-full">
              {bekle ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Bildirimi gönder
            </button>

            {sonuc && (
              <div className="rounded-xl bg-success/10 text-success-content border border-success/20 p-3 text-sm flex items-start gap-2">
                <Check size={16} className="text-success shrink-0 mt-0.5" />
                <div>
                  <b>{sonuc.gonderildi}</b> / {sonuc.toplam} cihaza ulaştı.
                  {sonuc.temizlenen > 0 && <span className="text-base-content/50"> · {sonuc.temizlenen} ölü abonelik temizlendi.</span>}
                  {Array.isArray(sonuc.detay) && (
                    <div className="text-[11px] text-base-content/50 mt-1">
                      {sonuc.detay.map((d, i) => <span key={i} className="mr-2">{d.host?.replace('.googleapis.com', '').replace('web.push.', '')}: {d.durum}</span>)}
                    </div>
                  )}
                </div>
              </div>
            )}
            {hata && <div className="rounded-xl bg-error/10 text-error border border-error/20 p-3 text-sm">{hata}</div>}
          </div>
        </form>
      </section>

      {/* RAPOR — gönderilen bildirimler */}
      <section className="bg-base-100 border border-base-300 rounded-3xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-semibold text-base-content/70 flex items-center gap-1.5"><History size={16} /> Gönderilen bildirimler</h2>
          <div className="flex items-center gap-1.5">
            {/* Tür filtresi */}
            <div className="flex gap-1">
              {[
                { k: 'hepsi', ad: 'Tümü' },
                { k: 'duyuru', ad: 'Duyurular' },
                { k: 'fiyat', ad: 'Fiyat' },
              ].map((f) => (
                <button key={f.k} onClick={() => setFiltre(f.k)}
                  className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition ${filtre === f.k ? 'bg-primary text-primary-content border-primary' : 'bg-base-100 text-base-content/60 border-base-300 hover:bg-base-200'}`}>
                  {f.ad}
                </button>
              ))}
            </div>
            <button onClick={() => { gecmisYukle(); acanYukle() }} className="btn btn-ghost btn-xs gap-1 text-base-content/50"><RefreshCw size={13} /> Yenile</button>
          </div>
        </div>

        {gecmis == null ? (
          <div className="flex justify-center py-8 text-base-content/40"><Loader2 className="animate-spin" /></div>
        ) : (() => {
          const list = gecmis.filter((b) => filtre === 'hepsi' ? true : filtre === 'fiyat' ? b.tur === 'fiyat' : b.tur !== 'fiyat')
          if (!list.length) return <div className="text-center text-sm text-base-content/50 py-8">Bu filtrede bildirim yok.</div>
          return (
            <div className="overflow-x-auto -mx-1">
              <table className="table table-sm">
                <thead>
                  <tr className="text-[11px] text-base-content/50">
                    <th>Bildirim</th>
                    <th className="whitespace-nowrap">Tür</th>
                    <th className="whitespace-nowrap text-right">Ulaşan</th>
                    <th className="whitespace-nowrap text-right">Açan</th>
                    <th className="whitespace-nowrap text-right">Açmayan</th>
                    <th className="whitespace-nowrap text-right">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((b) => {
                    const fiyat = b.tur === 'fiyat'
                    const acanSay = acan[String(b.id)] || 0
                    const ulasan = b.gonderildi != null ? b.gonderildi : (b.toplam != null ? b.toplam : null)
                    const acmayan = ulasan != null ? Math.max(0, ulasan - acanSay) : null
                    const oran = ulasan > 0 ? Math.round((acanSay / ulasan) * 100) : null
                    return (
                      <tr key={b.id}>
                        <td className="max-w-[300px]">
                          <div className="flex items-start gap-2">
                            <div className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${fiyat ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary'}`}>
                              {fiyat ? <Tag size={14} /> : <Megaphone size={14} />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm leading-tight truncate">{b.baslik}</div>
                              {b.govde && <div className="text-[11px] text-base-content/50 leading-tight truncate">{b.govde}</div>}
                            </div>
                          </div>
                        </td>
                        <td><span className={`badge badge-xs ${fiyat ? 'badge-secondary' : 'badge-primary'} badge-outline`}>{fiyat ? 'Fiyat' : 'Duyuru'}</span></td>
                        <td className="text-right whitespace-nowrap tabular-nums text-sm">
                          {ulasan != null ? <><b>{b.gonderildi ?? ulasan}</b><span className="text-base-content/40">/{b.toplam ?? '—'}</span></> : <span className="text-base-content/30">—</span>}
                        </td>
                        <td className="text-right whitespace-nowrap tabular-nums text-sm">
                          <span className="text-success font-semibold">{acanSay}</span>
                          {oran != null && <span className="text-[10px] text-base-content/40"> %{oran}</span>}
                        </td>
                        <td className="text-right whitespace-nowrap tabular-nums text-sm text-base-content/50">{acmayan != null ? acmayan : '—'}</td>
                        <td className="text-right whitespace-nowrap text-[11px] text-base-content/50" title={new Date(b.created_at).toLocaleString('tr-TR')}>
                          {new Date(b.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="text-[10px] text-base-content/40 mt-2 px-1">
                "Açan" = bildirimi uygulamada gören tekil kişi sayısı. "Ulaşan" = push'un iletildiği cihaz sayısı.
              </p>
            </div>
          )
        })()}
      </section>
    </div>
  )
}

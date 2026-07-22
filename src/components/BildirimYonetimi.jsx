import { useState } from 'react'
import { BellRing, Send, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Admin: tüm push abonelerine toplu duyuru gönderme.
export default function BildirimYonetimi() {
  const [baslik, setBaslik] = useState('')
  const [mesaj, setMesaj] = useState('')
  const [url, setUrl] = useState('')
  const [bekle, setBekle] = useState(false)
  const [sonuc, setSonuc] = useState(null)
  const [hata, setHata] = useState('')

  async function gonder(e) {
    e.preventDefault()
    setBekle(true); setHata(''); setSonuc(null)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) { setHata('Oturum bulunamadı, tekrar giriş yap.'); setBekle(false); return }
      const r = await fetch('/api/push-gonder', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
        body: JSON.stringify({ baslik: baslik.trim(), mesaj: mesaj.trim(), url: url.trim() || '/' }),
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
        setBaslik(''); setMesaj(''); setUrl('')
      }
    } catch (err) {
      setHata('Gönderilemedi. ' + (err.message || ''))
    } finally { setBekle(false) }
  }

  return (
    <section className="bg-base-100 border border-base-300 rounded-3xl p-4 space-y-3">
      <h2 className="text-sm font-semibold text-base-content/70 flex items-center gap-1.5"><BellRing size={16} /> Toplu Bildirim Gönder</h2>
      <p className="text-xs text-base-content/50">Bildirim izni veren tüm kullanıcılara anında push gider. (Kampanya, duyuru, fırsat…)</p>
      <form onSubmit={gonder} className="space-y-2">
        <input value={baslik} onChange={(e) => setBaslik(e.target.value)} maxLength={60} placeholder="Başlık (ör. 🔥 Bugün süt çok ucuz!)" className="input input-bordered input-sm w-full" />
        <textarea value={mesaj} onChange={(e) => setMesaj(e.target.value)} maxLength={160} rows={2} placeholder="Mesaj (ör. Migros ve BİM'de süt fiyatları düştü, hemen bak.)" className="textarea textarea-bordered textarea-sm w-full" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Tıklanınca gidilecek yol (opsiyonel, ör. /#/sepet)" className="input input-bordered input-sm w-full" />
        <button type="submit" disabled={bekle || (!baslik.trim() && !mesaj.trim())} className="btn btn-primary btn-sm w-full">
          {bekle ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Bildirimi gönder
        </button>
      </form>
      {sonuc && (
        <div className="alert alert-success text-xs py-2">
          ✓ Gönderildi: <b>{sonuc.gonderildi}</b> / {sonuc.toplam} kişi{sonuc.temizlenen > 0 ? ` · ${sonuc.temizlenen} eski abonelik temizlendi` : ''}
        </div>
      )}
      {hata && <div className="alert alert-error text-xs py-2">{hata}</div>}
    </section>
  )
}

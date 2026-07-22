import { useState, useSyncExternalStore } from 'react'
import { Film, Upload, Loader2 } from 'lucide-react'
import { subscribeAyar, getAyar, ayarGetir, ayarKaydet } from '../lib/ayarlar'
import { supabase } from '../lib/supabase'

// Admin: "Nasıl kullanılır?" videosunu ayarla — URL yapıştır ya da dosya yükle.
export default function VideoYonetimi() {
  useSyncExternalStore(subscribeAyar, getAyar)
  const [url, setUrl] = useState(ayarGetir('nasil_video') || '')
  const [durum, setDurum] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  async function kaydet() {
    await ayarKaydet('nasil_video', url.trim() || null)
    setDurum(url.trim() ? 'Kaydedildi ✓ — ana sayfada "Nasıl kullanılır?" düğmesi açar.' : 'Video kaldırıldı.')
  }

  async function dosyaSec(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setYukleniyor(true); setDurum('Yükleniyor... (' + Math.round(f.size / 1024 / 1024) + ' MB)')
    try {
      const path = `nasil/${Date.now()}-${f.name.replace(/[^\w.\-]/g, '_')}`
      const { error } = await supabase.storage.from('medya').upload(path, f, { upsert: true, contentType: f.type })
      if (error) throw error
      const { data } = supabase.storage.from('medya').getPublicUrl(path)
      setUrl(data.publicUrl)
      await ayarKaydet('nasil_video', data.publicUrl)
      setDurum('Yüklendi ve kaydedildi ✓')
    } catch (err) {
      setDurum('Yükleme olmadı: ' + (err?.message || err) + '. "medya" deposunu kurmadıysan, videoyu public/ klasörüne koyup URL kutusuna /video.mp4 yazabilirsin.')
    } finally { setYukleniyor(false) }
  }

  return (
    <section className="bg-base-100 border border-base-300 rounded-2xl p-4 space-y-3">
      <div className="font-semibold flex items-center gap-2"><Film size={18} className="text-primary" /> "Nasıl kullanılır?" videosu</div>
      <p className="text-xs text-base-content/60">Ana sayfadaki "Nasıl kullanılır?" düğmesi bu videoyu sayfa içinde açar. MP4 bağlantısı (ya da YouTube) yapıştır, veya dosya yükle.</p>
      <div className="flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://.../video.mp4 · /video.mp4 · YouTube linki" className="input input-bordered input-sm flex-1" />
        <button onClick={kaydet} className="btn btn-primary btn-sm">Kaydet</button>
      </div>
      <label className="btn btn-outline btn-sm w-fit cursor-pointer">
        {yukleniyor ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Dosya yükle
        <input type="file" accept="video/*" onChange={dosyaSec} className="hidden" disabled={yukleniyor} />
      </label>
      {durum && <div className="text-xs text-base-content/70 leading-snug">{durum}</div>}
      {url && !/youtu/.test(url) && <video src={url} controls className="w-full max-w-[220px] rounded-xl border border-base-300 mt-1" />}
    </section>
  )
}

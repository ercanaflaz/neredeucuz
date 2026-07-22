import { useEffect, useState } from 'react'
import { Bell, BellOff, Tag, Megaphone, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import BildirimAc from '../components/BildirimAc'

// Göreli zaman ("3 dk önce")
function zamanKisa(iso) {
  try {
    const fark = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
    if (fark < 60) return 'az önce'
    if (fark < 3600) return Math.floor(fark / 60) + ' dk önce'
    if (fark < 86400) return Math.floor(fark / 3600) + ' saat önce'
    if (fark < 604800) return Math.floor(fark / 86400) + ' gün önce'
    return new Date(iso).toLocaleDateString('tr-TR')
  } catch { return '' }
}

export default function Bildirimler({ user }) {
  const [liste, setListe] = useState(null) // null = yükleniyor
  const [hata, setHata] = useState('')

  useEffect(() => {
    let iptal = false
    ;(async () => {
      setHata('')
      try {
        // RLS: herkese açık duyurular + kişinin kendi bildirimleri gelir
        const { data, error } = await supabase
          .from('bildirimler')
          .select('id,baslik,govde,url,tur,created_at')
          .order('created_at', { ascending: false })
          .limit(50)
        if (error) throw error
        if (!iptal) setListe(data || [])
      } catch (e) {
        if (!iptal) { setListe([]); setHata('Bildirimler yüklenemedi.') }
      }
    })()
    return () => { iptal = true }
  }, [user?.id])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary grid place-items-center">
          <Bell size={18} />
        </div>
        <h1 className="text-xl font-bold">Bildirimler</h1>
      </div>

      {/* Bildirimleri açma kartı — kapalıysa buradan açılır */}
      <BildirimAc />

      {liste === null ? (
        <div className="flex justify-center py-10 text-base-content/40">
          <Loader2 className="animate-spin" />
        </div>
      ) : liste.length === 0 ? (
        <div className="text-center py-12 text-base-content/50">
          <BellOff size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Henüz bildirim yok</p>
          <p className="text-sm mt-1">Takip ettiğin ürün ucuzlayınca ve fırsatlarda burada göreceksin.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {liste.map((b) => {
            const fiyat = b.tur === 'fiyat'
            return (
              <li key={b.id}>
                <a
                  href={b.url && b.url.startsWith('/#/') ? b.url : '#/bildirimler'}
                  className="flex gap-3 rounded-2xl border border-base-300 bg-base-100 p-3 hover:bg-base-200 transition"
                >
                  <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${fiyat ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary'}`}>
                    {fiyat ? <Tag size={18} /> : <Megaphone size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm leading-snug">{b.baslik}</p>
                      <span className="text-[11px] text-base-content/40 shrink-0 mt-0.5">{zamanKisa(b.created_at)}</span>
                    </div>
                    {b.govde && <p className="text-xs text-base-content/60 mt-0.5 line-clamp-2">{b.govde}</p>}
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      )}

      {hata && <p className="text-xs text-error text-center">{hata}</p>}
    </div>
  )
}

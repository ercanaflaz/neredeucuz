import { useState } from 'react'
import { useSyncExternalStore } from 'react'
import { Sparkles, X } from 'lucide-react'
import { subscribe, getSnapshot } from '../lib/store'
import { subscribeAuth, getAuth, googleIleGiris } from '../lib/auth'

const K = 'ne_giris_oneri'

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 16 3 9.1 7.6 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.9 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-6.9l-6.5 5C9.1 42.3 16 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C40.9 36 45 30.6 45 24c0-1.4-.1-2.4-.4-3.5z"/></svg>
  )
}

// 2. ADIM: Konum kararı verildikten SONRA çıkan giriş önerisi (misafirse).
export default function GirisOnerisi() {
  const store = useSyncExternalStore(subscribe, getSnapshot)
  const auth = useSyncExternalStore(subscribeAuth, getAuth)
  const [kapali, setKapali] = useState(() => {
    try { return localStorage.getItem(K) === 'kapali' } catch { return false }
  })

  const konumBitti = store.konumSoruldu || store.konumDurumu === 'tamam'
  if (!konumBitti || auth.user || kapali) return null

  const kapat = () => {
    try { localStorage.setItem(K, 'kapali') } catch { /* yok */ }
    setKapali(true)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-base-100 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl">
        <div className="flex justify-end -mt-2 -mr-2">
          <button onClick={kapat} className="btn btn-ghost btn-sm btn-circle"><X size={18} /></button>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center mx-auto -mt-4">
          <Sparkles size={28} />
        </div>
        <div>
          <h2 className="text-lg font-bold">Giriş yap, sana özel olsun</h2>
          <p className="text-sm text-base-content/60 mt-1">
            Giriş yaparsan <b>favorilerin, listelerin ve alışveriş geçmişin</b> tüm cihazlarında
            hatırlanır; alışkanlıklarına göre <b>sana özel öneriler</b> ve <b>fiyat düşünce haber</b> geliriz.
          </p>
        </div>
        <div className="space-y-2">
          <button onClick={() => googleIleGiris()} className="btn btn-secondary w-full gap-2">
            <GoogleLogo /> Google ile giriş yap
          </button>
          <a href="#/giris" onClick={kapat} className="btn btn-ghost btn-sm w-full">
            E-posta ile giriş / kayıt ol
          </a>
          <button onClick={kapat} className="text-[11px] text-base-content/40 underline">Şimdi değil</button>
        </div>
      </div>
    </div>
  )
}

import { useSyncExternalStore } from 'react'
import { Lock, Sparkles, X } from 'lucide-react'
import { subscribeGiris, getGiris, girisKapat } from '../lib/girisKapisi'
import { googleIleGiris } from '../lib/auth'

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 16 3 9.1 7.6 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.9 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-6.9l-6.5 5C9.1 42.3 16 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C40.9 36 45 30.6 45 24c0-1.4-.1-2.4-.4-3.5z"/></svg>
  )
}

// Misafir kişisel bir işlem yapmaya çalışınca çıkan giriş kapısı.
export default function GirisKapisi() {
  const g = useSyncExternalStore(subscribeGiris, getGiris)
  if (!g.acik) return null

  const islem = g.islem || 'bu işlemi yapmak'

  return (
    <div className="fixed inset-0 z-[75] bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={girisKapat}>
      <div className="bg-base-100 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end -mt-2 -mr-2">
          <button onClick={girisKapat} className="btn btn-ghost btn-sm btn-circle"><X size={18} /></button>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center mx-auto -mt-4">
          <Lock size={28} />
        </div>
        <div>
          <h2 className="text-lg font-bold">Bunun için giriş yapmalısın</h2>
          <p className="text-sm text-base-content/60 mt-1">
            <b>{islem}</b> için bir hesap gerekiyor. Giriş yaparsan favorilerin, listelerin ve
            alarmların <b>hesabına kaydedilir</b> ve <b>tüm cihazlarında</b> görünür.
          </p>
        </div>
        <div className="rounded-2xl bg-secondary/10 border border-secondary/20 p-2.5 text-xs text-base-content/70 flex items-center gap-2 text-left">
          <Sparkles size={15} className="text-secondary shrink-0" />
          <span>Ücretsiz — 5 saniyede Google ile giriş yap, kaldığın yerden devam et.</span>
        </div>
        <div className="space-y-2">
          <button onClick={() => googleIleGiris()} className="btn btn-secondary w-full gap-2">
            <GoogleLogo /> Google ile giriş yap
          </button>
          <a href="#/giris" onClick={girisKapat} className="btn btn-ghost btn-sm w-full">
            E-posta ile giriş / kayıt ol
          </a>
        </div>
      </div>
    </div>
  )
}

import { useSyncExternalStore } from 'react'
import { MapPin, Loader2, Sparkles } from 'lucide-react'
import { subscribe, getSnapshot, konumIste, konumSormaKapat } from '../lib/store'
import { subscribeAuth, getAuth, googleIleGiris } from '../lib/auth'

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 16 3 9.1 7.6 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.9 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-6.9l-6.5 5C9.1 42.3 16 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C40.9 36 45 30.6 45 24c0-1.4-.1-2.4-.4-3.5z"/></svg>
  )
}

// Siteye ilk girişte konum ister + giriş yapmayı önerir.
// Konum: bölge fiyatları için. Giriş: favori/liste/geçmiş hatırlansın + özel öneriler.
export default function LocationGate() {
  const store = useSyncExternalStore(subscribe, getSnapshot)
  const auth = useSyncExternalStore(subscribeAuth, getAuth)

  // Daha önce sorulduysa ya da konum alındıysa gösterme
  if (store.konumSoruldu || store.konumDurumu === 'tamam') return null

  const bekliyor = store.konumDurumu === 'isteniyor'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4 overflow-y-auto">
      <div className="bg-base-100 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl my-auto">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <MapPin size={30} />
        </div>
        <div>
          <h2 className="text-lg font-bold">Bölgeni öğrenelim</h2>
          <p className="text-sm text-base-content/60 mt-1">
            Konumunu paylaş; sana <b>en yakın marketleri</b> ve o bölgedeki
            <b> güncel fiyatları</b> getirelim.
          </p>
        </div>
        <div className="space-y-2">
          <button onClick={konumIste} disabled={bekliyor} className="btn btn-primary w-full">
            {bekliyor ? <Loader2 className="animate-spin" size={18} /> : <MapPin size={18} />}
            Konumumu paylaş
          </button>
          <button onClick={konumSormaKapat} disabled={bekliyor} className="btn btn-ghost btn-sm w-full">
            Şimdi değil
          </button>
        </div>
        <p className="text-[11px] text-base-content/40">
          Konum sadece yakın fiyatları göstermek için kullanılır, kaydedilmez.
        </p>

        {/* GİRİŞ ÖNERİSİ — favori/liste/geçmiş hatırlansın + özel öneriler */}
        {!auth.user && (
          <div className="rounded-2xl bg-secondary/10 border border-secondary/25 p-3.5 space-y-2.5 text-left">
            <div className="font-bold text-sm flex items-center gap-1.5 text-secondary">
              <Sparkles size={15} /> Giriş yap, sana özel olsun
            </div>
            <p className="text-xs text-base-content/70 leading-relaxed">
              Giriş yaparsan <b>favorilerin, listelerin ve alışveriş geçmişin</b> tüm cihazlarında
              hatırlanır. Neleri arayıp neleri aldığına bakıp <b>sana özel öneriler</b> ve
              <b> fiyat düşünce haber</b> getiririz. <b>Şiddetle öneririz 👇</b>
            </p>
            <button onClick={() => googleIleGiris()} className="btn btn-secondary w-full gap-2">
              <GoogleLogo /> Google ile giriş yap
            </button>
            <a href="#/giris" onClick={konumSormaKapat} className="block text-center text-[11px] text-base-content/50 underline">
              E-posta ile giriş / kayıt ol
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

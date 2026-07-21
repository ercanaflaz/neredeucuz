import { useState } from 'react'
import { LogOut, Mail } from 'lucide-react'
import { kayitOl, girisYap, cikisYap, googleIleGiris, facebookIleGiris } from '../lib/auth'

export default function Login({ user }) {
  const [mod, setMod] = useState('giris') // giris | kayit
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState(null)
  const [bilgi, setBilgi] = useState(null)
  const [bekle, setBekle] = useState(false)

  async function sosyal(saglayici) {
    setHata(null)
    try {
      if (saglayici === 'google') await googleIleGiris()
      else await facebookIleGiris()
    } catch (err) {
      setHata(cevir(err?.message) + ' (Sağlayıcı Supabase\'de açık değilse önce oradan etkinleştir.)')
    }
  }

  async function gonder(e) {
    e.preventDefault()
    setHata(null); setBilgi(null); setBekle(true)
    try {
      if (mod === 'kayit') {
        await kayitOl(email.trim(), sifre)
        setBilgi('Kayıt oluşturuldu. E-posta doğrulaması açıksa gelen kutunu kontrol et.')
      } else {
        await girisYap(email.trim(), sifre)
      }
    } catch (err) {
      setHata(cevir(err?.message))
    } finally {
      setBekle(false)
    }
  }

  if (user) {
    return (
      <div className="space-y-4">
        <div className="bg-base-100 rounded-2xl p-5 border border-base-300 text-center space-y-1">
          <Mail className="mx-auto text-primary" />
          <div className="font-medium">{user.email}</div>
          <div className="text-xs text-base-content/50">Giriş yapıldı</div>
        </div>
        <button onClick={cikisYap} className="btn btn-outline w-full">
          <LogOut size={18} /> Çıkış yap
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <div className="flex bg-base-200 rounded-xl p-1">
        <button onClick={() => setMod('giris')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mod === 'giris' ? 'bg-base-100 shadow' : 'text-base-content/60'}`}>Giriş</button>
        <button onClick={() => setMod('kayit')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mod === 'kayit' ? 'bg-base-100 shadow' : 'text-base-content/60'}`}>Kayıt ol</button>
      </div>

      {/* Sosyal giriş */}
      <div className="space-y-2">
        <button type="button" onClick={() => sosyal('google')} className="btn btn-outline w-full gap-2">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 16 3 9.1 7.6 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.9 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-6.9l-6.5 5C9.1 42.3 16 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C40.9 36 45 30.6 45 24c0-1.4-.1-2.4-.4-3.5z"/></svg>
          Google ile devam et
        </button>
        <button type="button" onClick={() => sosyal('facebook')} className="btn btn-outline w-full gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.68 4.53-4.68 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.24h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
          Facebook ile devam et
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-base-content/40">
        <span className="flex-1 h-px bg-base-300" /> veya e-posta ile <span className="flex-1 h-px bg-base-300" />
      </div>

      <form onSubmit={gonder} className="space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta" className="input input-bordered w-full" autoComplete="email" />
        <input type="password" required minLength={6} value={sifre} onChange={(e) => setSifre(e.target.value)} placeholder="Şifre (en az 6 karakter)" className="input input-bordered w-full" autoComplete={mod === 'kayit' ? 'new-password' : 'current-password'} />
        <button type="submit" disabled={bekle} className="btn btn-primary w-full">
          {bekle ? '...' : mod === 'kayit' ? 'Kayıt ol' : 'Giriş yap'}
        </button>
      </form>

      {hata && <div className="alert alert-error text-sm">{hata}</div>}
      {bilgi && <div className="alert alert-success text-sm">{bilgi}</div>}

      <p className="text-xs text-base-content/50 text-center">
        Giriş isteğe bağlıdır — favori, alarm ve sepetin girişsiz de çalışır. Giriş yaparsan bunlar <b>tüm cihazlarında</b> senkron olur.
      </p>
    </div>
  )
}

function cevir(msg = '') {
  if (/Invalid login/i.test(msg)) return 'E-posta ya da şifre hatalı.'
  if (/already registered/i.test(msg)) return 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.'
  if (/rate limit/i.test(msg)) return 'Çok fazla deneme. Biraz sonra tekrar dene.'
  return msg || 'Bir hata oluştu.'
}

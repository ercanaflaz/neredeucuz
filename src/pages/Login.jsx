import { useState } from 'react'
import { LogOut, Mail, ShieldCheck, X } from 'lucide-react'
import { kayitOl, girisYap, cikisYap, googleIleGiris } from '../lib/auth'
import BildirimAc from '../components/BildirimAc'

export default function Login({ user }) {
  const [mod, setMod] = useState('giris') // giris | kayit
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState(null)
  const [bilgi, setBilgi] = useState(null)
  const [bekle, setBekle] = useState(false)
  const [kvkk, setKvkk] = useState(false)
  const [kvkkAcik, setKvkkAcik] = useState(false)

  async function googleGiris() {
    setHata(null)
    try {
      await googleIleGiris()
    } catch (err) {
      setHata(cevir(err?.message))
    }
  }

  async function gonder(e) {
    e.preventDefault()
    setHata(null); setBilgi(null)
    if (mod === 'kayit' && !kvkk) { setHata('Devam etmek için KVKK Aydınlatma Metni’ni onaylamalısın.'); return }
    setBekle(true)
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
        <BildirimAc />
        <button onClick={cikisYap} className="btn btn-outline w-full">
          <LogOut size={18} /> Çıkış yap
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <div className="flex flex-col items-center gap-2 pt-2">
        <img src="/favicon.svg" alt="neredeucuz" className="w-14 h-14 rounded-2xl shadow-sm" />
        <div className="font-extrabold text-xl"><span className="text-primary">nerede</span><span className="text-secondary">ucuz</span></div>
      </div>
      <div className="flex bg-base-200 rounded-xl p-1">
        <button onClick={() => setMod('giris')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mod === 'giris' ? 'bg-base-100 shadow' : 'text-base-content/60'}`}>Giriş</button>
        <button onClick={() => setMod('kayit')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mod === 'kayit' ? 'bg-base-100 shadow' : 'text-base-content/60'}`}>Kayıt ol</button>
      </div>

      {/* Sosyal giriş */}
      <div className="space-y-2">
        <button type="button" onClick={googleGiris} className="btn btn-outline w-full gap-2">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 16 3 9.1 7.6 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.9 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-6.9l-6.5 5C9.1 42.3 16 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C40.9 36 45 30.6 45 24c0-1.4-.1-2.4-.4-3.5z"/></svg>
          Google ile devam et
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-base-content/40">
        <span className="flex-1 h-px bg-base-300" /> veya e-posta ile <span className="flex-1 h-px bg-base-300" />
      </div>

      <form onSubmit={gonder} className="space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta" className="input input-bordered w-full" autoComplete="email" />
        <input type="password" required minLength={6} value={sifre} onChange={(e) => setSifre(e.target.value)} placeholder="Şifre (en az 6 karakter)" className="input input-bordered w-full" autoComplete={mod === 'kayit' ? 'new-password' : 'current-password'} />
        {mod === 'kayit' && (
          <label className="flex items-start gap-2 text-xs text-base-content/70 cursor-pointer">
            <input type="checkbox" checked={kvkk} onChange={(e) => setKvkk(e.target.checked)} className="checkbox checkbox-sm checkbox-primary mt-0.5" />
            <span>
              <button type="button" onClick={() => setKvkkAcik(true)} className="link link-primary">KVKK Aydınlatma Metni</button>'ni okudum, kişisel verilerimin işlenmesini onaylıyorum.
            </span>
          </label>
        )}
        <button type="submit" disabled={bekle} className="btn btn-primary w-full">
          {bekle ? '...' : mod === 'kayit' ? 'Kayıt ol' : 'Giriş yap'}
        </button>
      </form>

      {hata && <div className="alert alert-error text-sm">{hata}</div>}
      {bilgi && <div className="alert alert-success text-sm">{bilgi}</div>}

      <p className="text-xs text-base-content/50 text-center">
        Giriş isteğe bağlıdır — favori, alarm ve sepetin girişsiz de çalışır. Giriş yaparsan bunlar <b>tüm cihazlarında</b> senkron olur.
      </p>
      <p className="text-[11px] text-base-content/40 text-center">
        Devam ederek <button type="button" onClick={() => setKvkkAcik(true)} className="underline">KVKK Aydınlatma Metni</button>'ni kabul etmiş olursun.
      </p>

      {kvkkAcik && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setKvkkAcik(false)}>
          <div className="bg-base-100 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2"><ShieldCheck size={18} className="text-primary" /> KVKK Aydınlatma Metni</h3>
              <button onClick={() => setKvkkAcik(false)} className="btn btn-ghost btn-sm btn-circle"><X size={18} /></button>
            </div>
            <div className="text-xs text-base-content/70 space-y-2 leading-relaxed">
              <p>neredeucuz olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında kişisel verilerinizin güvenliğine önem veriyoruz.</p>
              <p><b>Toplanan veriler:</b> E-posta adresiniz, oluşturduğunuz favori/liste/sepet bilgileri ve anonim kullanım verileri (baktığınız ürünler, aramalar).</p>
              <p><b>İşleme amacı:</b> Hesabınızı oluşturmak, verilerinizi cihazlarınız arasında senkronlamak, size özel öneri ve fiyat bildirimleri sunmak, hizmeti iyileştirmek.</p>
              <p><b>Konum:</b> Konum bilginiz yalnızca yakın market fiyatlarını göstermek için anlık kullanılır, <b>saklanmaz</b>.</p>
              <p><b>Paylaşım:</b> Verileriniz pazarlama amacıyla üçüncü kişilerle paylaşılmaz.</p>
              <p><b>Haklarınız:</b> Dilediğiniz zaman hesabınızı ve verilerinizi silebilir, verilerinize erişim talep edebilirsiniz. Talepleriniz için: <b>aflazercan@gmail.com</b></p>
            </div>
            <button onClick={() => { setKvkk(true); setKvkkAcik(false) }} className="btn btn-primary btn-sm w-full">Okudum, onaylıyorum</button>
          </div>
        </div>
      )}
    </div>
  )
}

function cevir(msg = '') {
  if (/Invalid login/i.test(msg)) return 'E-posta ya da şifre hatalı.'
  if (/already registered/i.test(msg)) return 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.'
  if (/rate limit/i.test(msg)) return 'Çok fazla deneme. Biraz sonra tekrar dene.'
  return msg || 'Bir hata oluştu.'
}

import { useSyncExternalStore, useEffect, useState, useRef } from 'react'
import { Home as HomeIcon, Search, Heart, User, ShoppingCart, Shield, Bell, Newspaper } from 'lucide-react'
import { subscribeAuth, getAuth } from './lib/auth'
import { subscribe, getSnapshot, favorileriYukle, alarmlariYukle, sepetiYukle, konumBaslat } from './lib/store'
import Home from './pages/Home'
import Product from './pages/Product'
import Favorites from './pages/Favorites'
import Login from './pages/Login'
import SepetSayfa from './pages/SepetSayfa'
import Admin from './pages/Admin'
import ReklamVer from './pages/ReklamVer'
import Bildirimler from './pages/Bildirimler'
import Brosurler from './pages/Brosurler'
import LocationGate from './components/LocationGate'
import ReklamRail from './components/ReklamRail'
import ReklamCagrisi from './components/ReklamCagrisi'
import AdSlot from './components/AdSlot'
import HataSiniri from './components/HataSiniri'
import GizlilikBildirimi from './components/GizlilikBildirimi'
import GirisKapisi from './components/GirisKapisi'
import BildirimDurtme from './components/BildirimDurtme'
import { listeYukle as akilliListeYukle, listeleriYukle } from './lib/akilliSepet'
import { reklamlariYukle } from './lib/reklam'
import { ayarlariYukle } from './lib/ayarlar'
import { sayfaIzle, izle, izlemeKullanici } from './lib/izleme'
import { subscribeBildirim, getBildirim, bildirimleriYukle } from './lib/bildirimler'

// Yol → okunur sayfa adı (analitik için)
const SAYFA_ADI = {
  '/': 'Ana Sayfa',
  '/sepet': 'Akıllı Sepet',
  '/favoriler': 'Favoriler',
  '/brosurler': 'Broşürler',
  '/bildirimler': 'Bildirimler',
  '/giris': 'Giriş / Hesap',
  '/admin': 'Admin',
}
function yolAdi(route) {
  if (SAYFA_ADI[route]) return SAYFA_ADI[route]
  const k = Object.keys(SAYFA_ADI).find((p) => p !== '/' && route.startsWith(p))
  return k ? SAYFA_ADI[k] : 'Sayfa'
}

function useHash() {
  const [hash, setHash] = useState(window.location.hash || '#/')
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

export default function App() {
  const auth = useSyncExternalStore(subscribeAuth, getAuth)
  const store = useSyncExternalStore(subscribe, getSnapshot)
  const bild = useSyncExternalStore(subscribeBildirim, getBildirim)
  const hash = useHash()
  const [secili, setSecili] = useState(null)

  useEffect(() => { konumBaslat(); reklamlariYukle(); ayarlariYukle() }, [])

  // Bildirimleri yükle (rozet için) — açılışta ve kullanıcı değişince
  useEffect(() => { bildirimleriYukle() }, [auth.user?.id])

  // Giriş yapan kullanıcıyı olaylara bağla (anonim ziyaretçi kimliği korunur)
  useEffect(() => { izlemeKullanici(auth.user?.id) }, [auth.user?.id])

  // Sayfa / ürün görüntüleme takibi (aynı ürünü/sayfayı iki kez saymayı önle)
  const sonUrun = useRef(null)
  useEffect(() => {
    if (secili) {
      const anahtar = secili.id || secili.title || secili.baslik
      if (sonUrun.current === anahtar) return
      sonUrun.current = anahtar
      izle('urun', {
        baslik: secili.title || secili.baslik || secili.ad || secili.isim || 'Ürün',
        detay: { id: secili.id || null, marka: secili.brand || secili.marka || null },
      })
    } else {
      sonUrun.current = null
      sayfaIzle(hash, yolAdi(route))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, secili])

  useEffect(() => {
    const t = setTimeout(() => {
      favorileriYukle(auth.user?.id)
      alarmlariYukle(auth.user?.id)
      sepetiYukle(auth.user?.id)
      akilliListeYukle(auth.user?.id)
      listeleriYukle(auth.user?.id)
    }, 0)
    return () => clearTimeout(t)
  }, [auth.user?.id])

  const route = hash.replace(/^#/, '') || '/'
  const sepetAdet = store.sepet.reduce((s, i) => s + (i.adet || 0), 0)
  const anaSayfa = !secili && route === '/'
  const bildirimAktif = !secili && route.startsWith('/bildirimler')
  const adminSayfa = !secili && route.startsWith('/admin')
  const reklamVerSayfa = !secili && route.startsWith('/reklam-ver')
  const genisSayfa = anaSayfa || adminSayfa || reklamVerSayfa
  // Alt reklam + çağrı şeridi: admin, reklam-ver ve bildirimler dışında (bildirimler sade kalsın)
  const altReklam = !adminSayfa && !reklamVerSayfa && !bildirimAktif
  const yanReklamGizle = adminSayfa || bildirimAktif

  const nav = [
    { key: 'ana', href: '#/', icon: HomeIcon, label: 'Ana Sayfa', active: !secili && route === '/' },
    { key: 'brosur', href: '#/brosurler', icon: Newspaper, label: 'Broşürler', active: !secili && route.startsWith('/brosurler') },
    { key: 'sepet', href: '#/sepet', icon: ShoppingCart, label: 'Sepet', badge: sepetAdet, active: !secili && route.startsWith('/sepet') },
    { key: 'fav', href: '#/favoriler', icon: Heart, label: 'Favoriler', active: !secili && route.startsWith('/favoriler') },
    { key: 'giris', href: '#/giris', icon: User, label: auth.user ? 'Hesap' : 'Giriş', active: !secili && route.startsWith('/giris') },
  ]
  if (auth.rol === 'admin') {
    nav.push({ key: 'admin', href: '#/admin', icon: Shield, label: 'Admin', active: !secili && route.startsWith('/admin') })
  }

  let sayfa
  if (secili) sayfa = <Product urun={secili} onBack={() => setSecili(null)} user={auth.user} />
  else if (route.startsWith('/reklam-ver')) sayfa = <ReklamVer />
  else if (route.startsWith('/admin')) sayfa = <Admin />
  else if (route.startsWith('/sepet')) sayfa = <SepetSayfa user={auth.user} onSelect={setSecili} />
  else if (route.startsWith('/favoriler')) sayfa = <Favorites onSelect={setSecili} user={auth.user} />
  else if (route.startsWith('/brosurler')) sayfa = <Brosurler />
  else if (route.startsWith('/bildirimler')) sayfa = <Bildirimler user={auth.user} />
  else if (route.startsWith('/giris')) sayfa = <Login user={auth.user} />
  else sayfa = <Home onSelect={setSecili} />

  return (
    <div className="min-h-full bg-base-200 flex flex-col">
      <LocationGate />
      <GizlilikBildirimi />
      <GirisKapisi />
      <BildirimDurtme />

      {/* ÜST BAR — masaüstünde menü linkleriyle */}
      <header className="safe-top bg-base-100 border-b border-base-300 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 md:h-16 flex items-center gap-2">
          <a href="#/" onClick={() => { setSecili(null); window.dispatchEvent(new Event('ne:anasayfa')) }} className="flex items-center gap-2 font-bold text-lg md:text-xl">
            <img src="/favicon.svg" alt="neredeucuz logo" className="w-8 h-8 md:w-9 md:h-9 rounded-lg shadow-sm" />
            <span><span className="text-primary">nerede</span><span className="text-secondary">ucuz</span></span>
          </a>
          <span className="text-xs text-base-content/50 hidden sm:inline">· en ucuz market senin cebinde</span>

          {/* Sağ taraf: masaüstü menü + EN SAĞDA zil */}
          <div className="ml-auto flex items-center gap-1">
            <nav className="hidden md:flex items-center gap-1">
              {nav.map((n) => (
                <a
                  key={n.key}
                  href={n.href}
                  onClick={() => { setSecili(null); if (n.key === 'ana') window.dispatchEvent(new Event('ne:anasayfa')) }}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    n.active ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-base-200'
                  }`}
                >
                  <span className="relative">
                    <n.icon size={18} />
                    {n.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-secondary text-secondary-content text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{n.badge}</span>
                    )}
                  </span>
                  {n.label}
                </a>
              ))}
            </nav>

            {/* Zil — en sağda, okunmamış rozetli (her boyutta) */}
            <a
              href="#/bildirimler"
              onClick={() => setSecili(null)}
              aria-label="Bildirimler"
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition md:ml-1 ${
                bildirimAktif ? 'bg-primary/10 text-primary' : 'text-base-content/70 hover:bg-base-200'
              }`}
            >
              <Bell size={20} />
              {bild.okunmamis > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white ring-2 ring-base-100 text-[10px] font-bold grid place-items-center">
                  {bild.okunmamis > 9 ? '9+' : bild.okunmamis}
                </span>
              )}
            </a>
          </div>
        </div>
      </header>

      {/* İÇERİK — masaüstünde solda/sağda reklam rayları */}
      <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 pt-4 pb-24 md:pb-10">
        <div className="flex gap-5 justify-center">
          {!yanReklamGizle && <ReklamRail konum="sol" className="hidden xl:block w-40 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className={genisSayfa ? '' : 'max-w-2xl mx-auto'}>
              <HataSiniri key={route + (secili?.id || '')}>{sayfa}</HataSiniri>
              {altReklam && (
                <div className="mt-6 space-y-3 max-w-2xl mx-auto">
                  <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_LIST} />
                  <ReklamCagrisi />
                </div>
              )}
            </div>
          </div>
          {!yanReklamGizle && <ReklamRail konum="sag" className="hidden xl:block w-40 shrink-0" />}
        </div>
      </main>

      {/* ALT SEKME — sadece mobil */}
      <nav className="fixed bottom-0 inset-x-0 bg-base-100 border-t border-base-300 safe-bottom z-20 md:hidden">
        <div className="max-w-2xl mx-auto grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0,1fr))` }}>
          {nav.map((n) => (
            <a
              key={n.key}
              href={n.href}
              onClick={() => { setSecili(null); if (n.key === 'ana') window.dispatchEvent(new Event('ne:anasayfa')) }}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-xs ${
                n.active ? 'text-primary font-semibold' : 'text-base-content/60'
              }`}
            >
              <span className="relative">
                <n.icon size={20} />
                {n.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-secondary text-secondary-content text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{n.badge}</span>
                )}
              </span>
              {n.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  )
}

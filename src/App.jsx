import { useSyncExternalStore, useEffect, useState } from 'react'
import { Home as HomeIcon, Search, Heart, User, ShoppingCart, Shield } from 'lucide-react'
import { subscribeAuth, getAuth } from './lib/auth'
import { subscribe, getSnapshot, favorileriYukle, alarmlariYukle, sepetiYukle, konumBaslat } from './lib/store'
import Home from './pages/Home'
import Product from './pages/Product'
import Favorites from './pages/Favorites'
import Login from './pages/Login'
import SepetSayfa from './pages/SepetSayfa'
import Admin from './pages/Admin'
import LocationGate from './components/LocationGate'
import ReklamRail from './components/ReklamRail'
import HataSiniri from './components/HataSiniri'
import { listeYukle as akilliListeYukle, listeleriYukle } from './lib/akilliSepet'
import { reklamlariYukle } from './lib/reklam'

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
  const hash = useHash()
  const [secili, setSecili] = useState(null)

  useEffect(() => { konumBaslat(); reklamlariYukle() }, [])

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

  const nav = [
    { key: 'ana', href: '#/', icon: HomeIcon, label: 'Ana Sayfa', active: !secili && route === '/' },
    { key: 'ara', href: '#/', icon: Search, label: 'Ara', active: false },
    { key: 'sepet', href: '#/sepet', icon: ShoppingCart, label: 'Sepet', badge: sepetAdet, active: !secili && route.startsWith('/sepet') },
    { key: 'fav', href: '#/favoriler', icon: Heart, label: 'Favoriler', active: !secili && route.startsWith('/favoriler') },
    { key: 'giris', href: '#/giris', icon: User, label: auth.user ? 'Hesap' : 'Giriş', active: !secili && route.startsWith('/giris') },
  ]
  if (auth.rol === 'admin') {
    nav.push({ key: 'admin', href: '#/admin', icon: Shield, label: 'Admin', active: !secili && route.startsWith('/admin') })
  }

  let sayfa
  if (secili) sayfa = <Product urun={secili} onBack={() => setSecili(null)} user={auth.user} />
  else if (route.startsWith('/admin')) sayfa = <Admin />
  else if (route.startsWith('/sepet')) sayfa = <SepetSayfa user={auth.user} onSelect={setSecili} />
  else if (route.startsWith('/favoriler')) sayfa = <Favorites onSelect={setSecili} user={auth.user} />
  else if (route.startsWith('/giris')) sayfa = <Login user={auth.user} />
  else sayfa = <Home onSelect={setSecili} />

  return (
    <div className="min-h-full bg-base-200 flex flex-col">
      <LocationGate />

      {/* ÜST BAR — masaüstünde menü linkleriyle */}
      <header className="bg-base-100 border-b border-base-300 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 md:h-16 flex items-center gap-2">
          <a href="#/" onClick={() => setSecili(null)} className="flex items-center gap-2 font-bold text-lg md:text-xl">
            <span className="text-primary">nerede</span><span className="text-secondary">ucuz</span>
          </a>
          <span className="text-xs text-base-content/50 hidden sm:inline">· en ucuz market senin cebinde</span>

          {/* Masaüstü yatay menü */}
          <nav className="ml-auto hidden md:flex items-center gap-1">
            {nav.map((n) => (
              <a
                key={n.key}
                href={n.href}
                onClick={() => setSecili(null)}
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
        </div>
      </header>

      {/* İÇERİK — masaüstünde solda/sağda reklam rayları */}
      <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 pt-4 pb-24 md:pb-10">
        <div className="flex gap-5 justify-center">
          <ReklamRail konum="sol" className="hidden xl:block w-40 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className={anaSayfa ? '' : 'max-w-2xl mx-auto'}>
              <HataSiniri key={route + (secili?.id || '')}>{sayfa}</HataSiniri>
            </div>
          </div>
          <ReklamRail konum="sag" className="hidden xl:block w-40 shrink-0" />
        </div>
      </main>

      {/* ALT SEKME — sadece mobil */}
      <nav className="fixed bottom-0 inset-x-0 bg-base-100 border-t border-base-300 safe-bottom z-20 md:hidden">
        <div className="max-w-2xl mx-auto grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0,1fr))` }}>
          {nav.map((n) => (
            <a
              key={n.key}
              href={n.href}
              onClick={() => setSecili(null)}
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

import { useState, useEffect } from 'react'
import { ShoppingCart, Wand2 } from 'lucide-react'
import Cart from './Cart'
import AkilliSepet from './AkilliSepet'

// Hash'e göre başlangıç sekmesi (#/sepet/akilli → Akıllı Sepet).
const ilkTab = () => (/akilli/i.test(window.location.hash) ? 'akilli' : 'sepet')

export default function SepetSayfa({ user, onSelect }) {
  const [tab, setTab] = useState(ilkTab)

  // Ana sayfadan #/sepet/akilli ile gelince doğru sekme açılsın.
  useEffect(() => {
    const on = () => setTab(ilkTab())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  function sec(t) {
    setTab(t)
    const yeni = t === 'akilli' ? '#/sepet/akilli' : '#/sepet'
    if (window.location.hash !== yeni) window.location.hash = yeni
  }

  return (
    <div className="space-y-4">
      <div className="flex bg-base-200 rounded-xl p-1 gap-1">
        <button
          onClick={() => sec('sepet')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${tab === 'sepet' ? 'bg-base-100 shadow text-primary' : 'text-base-content/60'}`}
        >
          <ShoppingCart size={16} /> Sepetim
        </button>
        <button
          onClick={() => sec('akilli')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${
            tab === 'akilli'
              ? 'bg-secondary text-secondary-content shadow-md'
              : 'bg-secondary/15 text-secondary hover:bg-secondary/25'
          }`}
        >
          <Wand2 size={16} /> Akıllı Sepet
        </button>
      </div>
      {tab === 'sepet' ? <Cart user={user} onAkilli={() => sec('akilli')} /> : <AkilliSepet user={user} onSelect={onSelect} />}
    </div>
  )
}

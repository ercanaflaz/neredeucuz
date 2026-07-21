import { useEffect, useState, useMemo } from 'react'
import {
  Shield, Users, Heart, ShoppingCart, Bell, Wand2, Search as SearchIcon,
  RefreshCw, Loader2, TrendingUp, Package,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getAuth } from '../lib/auth'
import { tl, tarih } from '../lib/format'
import ReklamYonetimi from '../components/ReklamYonetimi'

// Verilen kayıtları bir alana göre grupla, en çok N tanesini döndür.
function enCok(kayitlar, alan, n = 6) {
  const m = new Map()
  kayitlar.forEach((k) => {
    const key = (k[alan] || '—').trim()
    m.set(key, (m.get(key) || 0) + 1)
  })
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, n)
}

// Son 14 günün günlük yeni kullanıcı sayısı
function gunlukKayit(kullanicilar) {
  const gunler = []
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0)
  for (let i = 13; i >= 0; i--) {
    const g = new Date(bugun); g.setDate(g.getDate() - i)
    gunler.push({ g, key: g.toISOString().slice(0, 10), count: 0 })
  }
  kullanicilar.forEach((k) => {
    const key = (k.olusturuldu || '').slice(0, 10)
    const gun = gunler.find((x) => x.key === key)
    if (gun) gun.count += 1
  })
  return gunler
}

export default function Admin() {
  const { user, rol } = getAuth()
  const [v, setV] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState(null)

  async function yukle() {
    setYukleniyor(true); setHata(null)
    try {
      const [prof, fav, sep, alarm, akilli, arama] = await Promise.all([
        supabase.from('profiller').select('*').order('olusturuldu', { ascending: false }).limit(1000),
        supabase.from('favoriler').select('*').order('eklendi', { ascending: false }).limit(2000),
        supabase.from('sepet').select('*').order('eklendi', { ascending: false }).limit(2000),
        supabase.from('fiyat_alarmlari').select('*').order('olusturuldu', { ascending: false }).limit(2000),
        supabase.from('akilli_liste').select('*').limit(1000),
        supabase.from('aramalar').select('terim,olusturuldu').order('olusturuldu', { ascending: false }).limit(5000),
      ])
      if (prof.error) throw prof.error
      setV({
        kullanicilar: prof.data ?? [],
        favoriler: fav.data ?? [],
        sepet: sep.data ?? [],
        alarmlar: alarm.data ?? [],
        akilli: akilli.data ?? [],
        aramalar: arama.error ? [] : (arama.data ?? []),
      })
    } catch (e) {
      setHata('Veri çekilemedi. Admin SQL çalıştı mı ve hesabın admin mi? (' + (e.message || e) + ')')
    } finally {
      setYukleniyor(false)
    }
  }

  useEffect(() => { if (rol === 'admin') yukle() /* eslint-disable-next-line */ }, [rol])

  const topFav = useMemo(() => v ? enCok(v.favoriler, 'baslik') : [], [v])
  const topSepet = useMemo(() => v ? enCok(v.sepet, 'baslik') : [], [v])
  const topArama = useMemo(() => v ? enCok(v.aramalar, 'terim') : [], [v])
  const buyume = useMemo(() => v ? gunlukKayit(v.kullanicilar) : [], [v])
  const email = (id) => v?.kullanicilar.find((k) => k.id === id)?.email || (id ? id.slice(0, 8) : '—')

  if (!user) return <div className="text-center py-16 text-base-content/50">Admin panel için <a href="#/giris" className="link link-primary">giriş yap</a>.</div>
  if (rol !== 'admin') return (
    <div className="text-center py-16 text-base-content/50 space-y-2">
      <Shield size={36} className="mx-auto opacity-40" />
      <p className="text-sm">Bu hesap admin değil.</p>
      <p className="text-xs"><code>profiller</code> tablosunda rolünü <b>admin</b> yap.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><Shield className="text-primary" /> Kontrol Paneli</h1>
        <button onClick={yukle} disabled={yukleniyor} className="btn btn-sm rounded-xl">
          {yukleniyor ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Yenile
        </button>
      </div>

      {hata && <div className="alert alert-error text-sm">{hata}</div>}
      {!v && yukleniyor && <div className="flex justify-center py-16"><Loader2 className="animate-spin text-base-content/40" size={28} /></div>}

      {v && (
        <>
          {/* BENTO İSTATİSTİK IZGARASI */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Tile grad="from-violet-500 to-purple-600" icon={<Users size={18} />} n={v.kullanicilar.length} l="Kullanıcı" />
            <Tile grad="from-rose-500 to-pink-600" icon={<Heart size={18} />} n={v.favoriler.length} l="Favori" />
            <Tile grad="from-emerald-500 to-green-600" icon={<ShoppingCart size={18} />} n={v.sepet.length} l="Sepet ürünü" />
            <Tile grad="from-amber-400 to-orange-500" icon={<Bell size={18} />} n={v.alarmlar.length} l="Fiyat alarmı" />
            <Tile grad="from-cyan-400 to-blue-500" icon={<Wand2 size={18} />} n={v.akilli.length} l="Akıllı liste" />
            <Tile grad="from-fuchsia-500 to-pink-500" icon={<SearchIcon size={18} />} n={v.aramalar.length} l="Toplam arama" />
          </div>

          {/* REKLAM YÖNETİMİ */}
          <ReklamYonetimi />

          {/* BÜYÜME */}
          <Kart baslik="Yeni kullanıcılar — son 14 gün" ikon={<TrendingUp size={16} />}>
            <SutunGrafik veri={buyume} />
          </Kart>

          {/* İKİLİ: en çok aranan + en çok favorilenen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Kart baslik="En çok aranan ürünler" ikon={<SearchIcon size={16} />}>
              {topArama.length ? <BarListe veri={topArama} /> : <Bos metin="Henüz arama kaydı yok (analitik-kurulum.sql'i çalıştır)." />}
            </Kart>
            <Kart baslik="En çok favorilenen ürünler" ikon={<Heart size={16} />}>
              {topFav.length ? <BarListe veri={topFav} /> : <Bos metin="Henüz favori yok." />}
            </Kart>
          </div>

          {/* En çok sepete eklenen */}
          <Kart baslik="En çok sepete eklenen ürünler" ikon={<Package size={16} />}>
            {topSepet.length ? <BarListe veri={topSepet} /> : <Bos metin="Henüz sepet ürünü yok." />}
          </Kart>

          {/* Kullanıcılar tablosu */}
          <Kart baslik={`Kullanıcılar (${v.kullanicilar.length})`} ikon={<Users size={16} />}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-base-content/40 text-left"><th className="pb-2 pr-2 font-medium">E-posta</th><th className="pr-2 font-medium">Rol</th><th className="font-medium">Kayıt</th></tr></thead>
                <tbody>
                  {v.kullanicilar.map((k) => (
                    <tr key={k.id} className="border-t border-base-200">
                      <td className="py-2 pr-2">{k.email}</td>
                      <td className="pr-2"><span className={`badge badge-sm ${k.rol === 'admin' ? 'badge-primary' : 'badge-ghost'}`}>{k.rol}</span></td>
                      <td className="text-base-content/50 whitespace-nowrap">{tarih(k.olusturuldu)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kart>

          {/* Son sepet kalemleri */}
          <Kart baslik="Son sepete eklenenler" ikon={<ShoppingCart size={16} />}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-base-content/40 text-left"><th className="pb-2 pr-2 font-medium">Kullanıcı</th><th className="pr-2 font-medium">Ürün</th><th className="font-medium">Adet</th></tr></thead>
                <tbody>
                  {v.sepet.slice(0, 40).map((s) => (
                    <tr key={s.id} className="border-t border-base-200">
                      <td className="py-2 pr-2 text-base-content/60">{email(s.kullanici_id)}</td>
                      <td className="pr-2">{s.baslik}</td>
                      <td>{s.adet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kart>
        </>
      )}
    </div>
  )
}

function Tile({ grad, icon, n, l }) {
  return (
    <div className={`rounded-3xl p-4 bg-gradient-to-br ${grad} text-white shadow-sm`}>
      <div className="flex items-center gap-1.5 text-xs opacity-90">{icon} {l}</div>
      <div className="text-3xl font-extrabold mt-2 tabular-nums">{n}</div>
    </div>
  )
}
function Kart({ baslik, ikon, children }) {
  return (
    <section className="bg-base-100 border border-base-300 rounded-3xl p-4">
      <h2 className="text-sm font-semibold text-base-content/70 mb-3 flex items-center gap-1.5">{ikon} {baslik}</h2>
      {children}
    </section>
  )
}
function Bos({ metin }) {
  return <div className="text-xs text-base-content/40 py-4 text-center">{metin}</div>
}

// Yatay bar liste (büyüklük = tek hue; kimlik = etiket)
function BarListe({ veri }) {
  const max = Math.max(...veri.map((d) => d.count), 1)
  return (
    <div className="space-y-2">
      {veri.map((d, i) => (
        <div key={i} className="flex items-center gap-2" title={`${d.label}: ${d.count}`}>
          <div className="w-28 sm:w-40 text-xs truncate shrink-0" title={d.label}>{d.label}</div>
          <div className="flex-1 bg-base-200 rounded-full h-5 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.max(6, (d.count / max) * 100)}%` }} />
          </div>
          <div className="w-8 text-right text-xs font-semibold tabular-nums shrink-0">{d.count}</div>
        </div>
      ))}
    </div>
  )
}

// Basit sütun grafik (günlük)
function SutunGrafik({ veri }) {
  const max = Math.max(...veri.map((d) => d.count), 1)
  const gunAd = (g) => g.toLocaleDateString('tr-TR', { day: '2-digit' })
  return (
    <div className="flex items-end gap-1 h-28">
      {veri.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.g.toLocaleDateString('tr-TR')}: ${d.count} kayıt`}>
          <div className="w-full bg-base-200 rounded-md flex items-end overflow-hidden" style={{ height: '100%' }}>
            <div className="w-full bg-gradient-to-t from-primary to-green-400 rounded-md transition-all" style={{ height: `${(d.count / max) * 100}%` }} />
          </div>
          <div className="text-[9px] text-base-content/40">{gunAd(d.g)}</div>
        </div>
      ))}
    </div>
  )
}

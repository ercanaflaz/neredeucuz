import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Shield, Users, Heart, ShoppingCart, Bell, Wand2, Search as SearchIcon,
  RefreshCw, Loader2, TrendingUp, Package, LayoutDashboard, Radio, Globe,
  ArrowUpRight, Eye, UserCircle, Megaphone, Settings, Menu, X,
  Smartphone, Monitor, Tablet, Clock, MapPin, ScanLine, ListChecks, ChevronDown, LogOut,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getAuth, cikisYap } from '../lib/auth'
import { tarih } from '../lib/format'
import ReklamYonetimi from '../components/ReklamYonetimi'
import BrosurYonetimi from '../components/BrosurYonetimi'
import VideoYonetimi from '../components/VideoYonetimi'
import BildirimYonetimi from '../components/BildirimYonetimi'

// ======================= YARDIMCILAR =======================
const ULKE_AD = {
  TR: 'Türkiye', DE: 'Almanya', US: 'ABD', GB: 'İngiltere', NL: 'Hollanda',
  FR: 'Fransa', AT: 'Avusturya', BE: 'Belçika', CH: 'İsviçre', AZ: 'Azerbaycan',
  RU: 'Rusya', SA: 'S. Arabistan', AE: 'BAE', BG: 'Bulgaristan', GR: 'Yunanistan',
}
const ulkeAd = (k) => ULKE_AD[k] || k || '—'

// Bir alana göre grupla → en çok N
function enCok(kayitlar, alan, n = 8) {
  const m = new Map()
  kayitlar.forEach((k) => {
    const key = (typeof alan === 'function' ? alan(k) : k[alan]) || '—'
    const t = String(key).trim() || '—'
    m.set(t, (m.get(t) || 0) + 1)
  })
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, n)
}

// Olayları oturumlara ayır (oturum_id'ye göre)
function oturumlariCikar(olaylar) {
  const m = new Map()
  for (const o of olaylar) {
    let s = m.get(o.oturum_id)
    if (!s) {
      s = {
        oturum_id: o.oturum_id, ziyaretci_id: o.ziyaretci_id, kullanici_id: o.kullanici_id,
        kaynak: o.kaynak || 'Direkt', ulke: o.ulke, sehir: o.sehir, bolge: o.bolge,
        cihaz: o.cihaz, tarayici: o.tarayici, isletim: o.isletim,
        baslangic: o.created_at, bitis: o.created_at, olaylar: [],
      }
      m.set(o.oturum_id, s)
    }
    if (o.kullanici_id) s.kullanici_id = o.kullanici_id
    if (o.created_at < s.baslangic) s.baslangic = o.created_at
    if (o.created_at > s.bitis) s.bitis = o.created_at
    if (o.ulke && !s.ulke) s.ulke = o.ulke
    if (o.sehir && !s.sehir) s.sehir = o.sehir
    s.olaylar.push(o)
  }
  const list = [...m.values()]
  list.forEach((s) => {
    s.olaylar.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    s.sure = Math.max(0, Math.round((new Date(s.bitis) - new Date(s.baslangic)) / 1000))
  })
  return list.sort((a, b) => new Date(b.bitis) - new Date(a.bitis))
}

// Yerel (tarayıcı saat dilimi) gün anahtarı — UTC kayması olmadan eşleştirir.
// (Türkiye +3'te UTC'ye çevrilince gün bir geri kayıp bugünün verisi kutuya
// denk gelmiyordu; bu yüzden grafik boş görünüyordu.)
function yerelGun(d) {
  const x = d instanceof Date ? d : new Date(d)
  if (isNaN(x)) return ''
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

// Son 14 gün: günlük tekil ZİYARETÇİ (üstteki "Ziyaretçi" kartıyla tutarlı) + sayfa görüntüleme
function gunSerisi(olaylar) {
  const gunler = []
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0)
  for (let i = 13; i >= 0; i--) {
    const g = new Date(bugun); g.setDate(g.getDate() - i)
    gunler.push({ g, key: yerelGun(g), ziy: new Set(), sayfa: 0 })
  }
  olaylar.forEach((o) => {
    const gun = gunler.find((x) => x.key === yerelGun(o.created_at))
    if (gun) { gun.ziy.add(o.ziyaretci_id); if (o.tur === 'sayfa') gun.sayfa += 1 }
  })
  return gunler.map((x) => ({ g: x.g, deger: x.ziy.size, alt: x.sayfa }))
}

function kisaSure(sn) {
  if (!sn) return '0sn'
  if (sn < 60) return `${sn}sn`
  const dk = Math.floor(sn / 60), s = sn % 60
  if (dk < 60) return s ? `${dk}dk ${s}sn` : `${dk}dk`
  return `${Math.floor(dk / 60)}sa ${dk % 60}dk`
}
function oncekiZaman(iso) {
  const fark = Math.round((Date.now() - new Date(iso)) / 1000)
  if (fark < 10) return 'az önce'
  if (fark < 60) return `${fark} sn önce`
  if (fark < 3600) return `${Math.floor(fark / 60)} dk önce`
  if (fark < 86400) return `${Math.floor(fark / 3600)} sa önce`
  return tarih(iso)
}
const CihazIkon = ({ tur, ...p }) =>
  tur === 'mobil' ? <Smartphone {...p} /> : tur === 'tablet' ? <Tablet {...p} /> : <Monitor {...p} />

const TUR_ETIKET = {
  sayfa: 'Sayfa', urun: 'Ürün', arama: 'Arama', barkod: 'Barkod', liste: 'Liste', sepet: 'Sepet',
}
const TUR_RENK = {
  sayfa: 'bg-slate-400', urun: 'bg-violet-500', arama: 'bg-fuchsia-500',
  barkod: 'bg-cyan-500', liste: 'bg-amber-500', sepet: 'bg-emerald-500',
}

const ARALIKLAR = [
  { k: 'bugun', ad: 'Bugün' }, { k: '7', ad: '7 gün' }, { k: '30', ad: '30 gün' }, { k: 'tum', ad: 'Tümü' },
]

// ======================= ANA BİLEŞEN =======================
export default function Admin() {
  const { user, rol } = getAuth()
  const [v, setV] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState(null)
  const [bolum, setBolum] = useState('genel')
  const [aralik, setAralik] = useState('7')
  const [menuAcik, setMenuAcik] = useState(false)

  const yukle = useCallback(async () => {
    setYukleniyor(true); setHata(null)
    try {
      const [prof, fav, sep, alarm, akilli, arama, olay] = await Promise.all([
        supabase.from('profiller').select('*').order('olusturuldu', { ascending: false }).limit(2000),
        supabase.from('favoriler').select('*').order('eklendi', { ascending: false }).limit(3000),
        supabase.from('sepet').select('*').order('eklendi', { ascending: false }).limit(3000),
        supabase.from('fiyat_alarmlari').select('*').limit(3000),
        supabase.from('akilli_liste').select('*').limit(2000),
        supabase.from('aramalar').select('terim,olusturuldu').order('olusturuldu', { ascending: false }).limit(8000),
        supabase.from('olaylar').select('*').order('created_at', { ascending: false }).limit(8000),
      ])
      if (prof.error) throw prof.error
      setV({
        kullanicilar: prof.data ?? [],
        favoriler: fav.data ?? [],
        sepet: sep.data ?? [],
        alarmlar: alarm.error ? [] : (alarm.data ?? []),
        akilli: akilli.error ? [] : (akilli.data ?? []),
        aramalar: arama.error ? [] : (arama.data ?? []),
        olaylar: olay.error ? [] : (olay.data ?? []),
        olayHata: !!olay.error,
      })
    } catch (e) {
      setHata('Veri çekilemedi. Admin SQL çalıştı mı ve hesabın admin mi? (' + (e.message || e) + ')')
    } finally {
      setYukleniyor(false)
    }
  }, [])

  useEffect(() => { if (rol === 'admin') yukle() }, [rol, yukle])

  // Canlı bölümde 15 sn'de bir tazele
  useEffect(() => {
    if (rol !== 'admin' || bolum !== 'canli') return
    const t = setInterval(yukle, 15000)
    return () => clearInterval(t)
  }, [rol, bolum, yukle])

  // ---- tarih aralığına göre filtrelenmiş olaylar ----
  const esik = useMemo(() => {
    const now = Date.now()
    if (aralik === 'bugun') { const b = new Date(); b.setHours(0, 0, 0, 0); return b.getTime() }
    if (aralik === '7') return now - 7 * 86400000
    if (aralik === '30') return now - 30 * 86400000
    return 0
  }, [aralik])

  const olaylar = useMemo(
    () => (v?.olaylar || []).filter((o) => new Date(o.created_at).getTime() >= esik),
    [v, esik],
  )
  const oturumlar = useMemo(() => oturumlariCikar(olaylar), [olaylar])
  const seri = useMemo(() => gunSerisi(v?.olaylar || []), [v])
  const email = useCallback((id) => v?.kullanicilar.find((k) => k.id === id)?.email || null, [v])

  const metrik = useMemo(() => {
    const ziyaretci = new Set(olaylar.map((o) => o.ziyaretci_id)).size
    const sayfa = olaylar.filter((o) => o.tur === 'sayfa').length
    const urun = olaylar.filter((o) => o.tur === 'urun').length
    const canliEsik = Date.now() - 5 * 60 * 1000
    const canli = new Set((v?.olaylar || []).filter((o) => new Date(o.created_at).getTime() >= canliEsik).map((o) => o.ziyaretci_id)).size
    const ortSure = oturumlar.length ? Math.round(oturumlar.reduce((s, o) => s + o.sure, 0) / oturumlar.length) : 0
    return { ziyaretci, oturum: oturumlar.length, sayfa, urun, canli, uye: v?.kullanicilar.length || 0, ortSure }
  }, [olaylar, oturumlar, v])

  if (!user) return <div className="text-center py-16 text-base-content/50">Admin panel için <a href="#/giris" className="link link-primary">giriş yap</a>.</div>
  if (rol !== 'admin') return (
    <div className="text-center py-16 text-base-content/50 space-y-2">
      <Shield size={36} className="mx-auto opacity-40" />
      <p className="text-sm">Bu hesap admin değil.</p>
      <p className="text-xs"><code>profiller</code> tablosunda rolünü <b>admin</b> yap.</p>
    </div>
  )

  const BOLUMLER = [
    { k: 'genel', ad: 'Genel Bakış', ikon: LayoutDashboard },
    { k: 'canli', ad: 'Canlı', ikon: Radio, rozet: metrik.canli || null },
    { k: 'ziyaretci', ad: 'Ziyaretçiler', ikon: Users },
    { k: 'kaynak', ad: 'Kaynaklar', ikon: ArrowUpRight },
    { k: 'cografya', ad: 'Coğrafya', ikon: Globe },
    { k: 'goruntuleme', ad: 'Sayfa & Ürün', ikon: Eye },
    { k: 'arama', ad: 'Aramalar', ikon: SearchIcon },
    { k: 'uye', ad: 'Kullanıcılar', ikon: UserCircle },
    { k: 'bildirim', ad: 'Bildirimler', ikon: Bell },
    { k: 'icerik', ad: 'İçerik & Reklam', ikon: Megaphone },
    { k: 'ayar', ad: 'Ayarlar', ikon: Settings },
  ]
  const aktifAd = BOLUMLER.find((b) => b.k === bolum)?.ad || ''

  function menuSec(k) { setBolum(k); setMenuAcik(false) }

  const SidebarIc = (
    <nav className="flex flex-col gap-1">
      {BOLUMLER.map((b) => (
        <button
          key={b.k}
          onClick={() => menuSec(b.k)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition ${
            bolum === b.k ? 'bg-primary text-primary-content shadow-sm' : 'text-base-content/70 hover:bg-base-200'
          }`}
        >
          <b.ikon size={18} className="shrink-0" />
          <span className="flex-1 truncate">{b.ad}</span>
          {b.k === 'canli' && metrik.canli > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />{metrik.canli}
            </span>
          )}
        </button>
      ))}
      {/* Çıkış */}
      <div className="mt-2 pt-2 border-t border-base-200">
        <div className="px-3 pb-1.5 text-[11px] text-base-content/40 truncate">{user?.email}</div>
        <button
          onClick={() => cikisYap()}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left text-error hover:bg-error/10 transition"
        >
          <LogOut size={18} className="shrink-0" />
          <span className="flex-1">Çıkış yap</span>
        </button>
      </div>
    </nav>
  )

  return (
    <div className="flex gap-5 items-start">
      {/* SOL SIDEBAR — masaüstü sabit */}
      <aside className="hidden md:block w-56 shrink-0 sticky top-20">
        <div className="bg-base-100 border border-base-300 rounded-3xl p-3">
          <div className="flex items-center gap-2 px-2 pb-3 mb-1 border-b border-base-200">
            <Shield className="text-primary" size={20} />
            <span className="font-extrabold">Kontrol Paneli</span>
          </div>
          {SidebarIc}
        </div>
      </aside>

      {/* MOBİL ÇEKMECE */}
      {menuAcik && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMenuAcik(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-base-100 p-3 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-2 pb-3 mb-1 border-b border-base-200">
              <span className="font-extrabold flex items-center gap-2"><Shield className="text-primary" size={20} /> Panel</span>
              <button onClick={() => setMenuAcik(false)} className="btn btn-ghost btn-sm btn-circle"><X size={18} /></button>
            </div>
            {SidebarIc}
          </aside>
        </div>
      )}

      {/* İÇERİK */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* ÜST BAR */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setMenuAcik(true)} className="btn btn-sm btn-ghost btn-circle md:hidden"><Menu size={20} /></button>
          <h1 className="text-xl sm:text-2xl font-extrabold">{aktifAd}</h1>
          <div className="ml-auto flex items-center gap-2">
            {/* tarih aralığı */}
            <div className="join">
              {ARALIKLAR.map((a) => (
                <button key={a.k} onClick={() => setAralik(a.k)}
                  className={`join-item btn btn-xs sm:btn-sm ${aralik === a.k ? 'btn-primary' : 'btn-ghost bg-base-100 border-base-300'}`}>
                  {a.ad}
                </button>
              ))}
            </div>
            <button onClick={yukle} disabled={yukleniyor} className="btn btn-sm btn-circle rounded-xl">
              {yukleniyor ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            </button>
          </div>
        </div>

        {hata && <div className="alert alert-error text-sm">{hata}</div>}
        {v?.olayHata && (
          <div className="alert alert-warning text-sm">
            Ziyaretçi verisi tablosu (<code>olaylar</code>) bulunamadı. Supabase'de <b>izleme-kurulum.sql</b>'i çalıştır.
          </div>
        )}
        {!v && yukleniyor && <div className="flex justify-center py-24"><Loader2 className="animate-spin text-base-content/40" size={30} /></div>}

        {v && (
          <>
            {bolum === 'genel' && <GenelBakis metrik={metrik} seri={seri} oturumlar={oturumlar} olaylar={olaylar} v={v} />}
            {bolum === 'canli' && <Canli olaylarTum={v.olaylar} email={email} />}
            {bolum === 'ziyaretci' && <Ziyaretciler oturumlar={oturumlar} email={email} />}
            {bolum === 'kaynak' && <Kaynaklar oturumlar={oturumlar} />}
            {bolum === 'cografya' && <Cografya oturumlar={oturumlar} />}
            {bolum === 'goruntuleme' && <Goruntuleme olaylar={olaylar} v={v} />}
            {bolum === 'arama' && <Aramalar olaylar={olaylar} v={v} />}
            {bolum === 'uye' && <Kullanicilar v={v} />}
            {bolum === 'bildirim' && <BildirimYonetimi />}
            {bolum === 'icerik' && <div className="space-y-4"><BrosurYonetimi /><ReklamYonetimi /><VideoYonetimi /></div>}
            {bolum === 'ayar' && <Ayarlar />}
          </>
        )}
      </div>
    </div>
  )
}

// ======================= BÖLÜMLER =======================
function GenelBakis({ metrik, seri, oturumlar, olaylar, v }) {
  const kaynakDagilim = useMemo(() => enCok(oturumlar, 'kaynak', 6), [oturumlar])
  const topSayfa = useMemo(() => enCok(olaylar.filter((o) => o.tur === 'sayfa'), 'baslik', 6), [olaylar])
  const topUrun = useMemo(() => enCok(olaylar.filter((o) => o.tur === 'urun'), 'baslik', 6), [olaylar])
  const topArama = useMemo(() => enCok(v.aramalar, 'terim', 6), [v])
  const sonOturumlar = oturumlar.slice(0, 6)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Tile grad="from-emerald-500 to-green-600" icon={<Radio size={18} />} n={metrik.canli} l="Şu an aktif" canli />
        <Tile grad="from-violet-500 to-purple-600" icon={<Users size={18} />} n={metrik.ziyaretci} l="Ziyaretçi" />
        <Tile grad="from-blue-500 to-indigo-600" icon={<Eye size={18} />} n={metrik.sayfa} l="Sayfa görüntüleme" />
        <Tile grad="from-fuchsia-500 to-pink-600" icon={<Package size={18} />} n={metrik.urun} l="Ürün görüntüleme" />
        <Tile grad="from-amber-400 to-orange-500" icon={<Clock size={18} />} n={kisaSure(metrik.ortSure)} l="Ort. oturum" metin />
        <Tile grad="from-cyan-500 to-blue-500" icon={<UserCircle size={18} />} n={metrik.uye} l="Kayıtlı üye" />
      </div>

      <Kart baslik="Ziyaretçi trafiği — son 14 gün" ikon={<TrendingUp size={16} />}>
        <SutunGrafik veri={seri} altAd="sayfa görüntüleme" />
      </Kart>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Kart baslik="Trafik kaynakları" ikon={<ArrowUpRight size={16} />}>
          {kaynakDagilim.length ? <BarListe veri={kaynakDagilim} /> : <Bos metin="Henüz kaynak verisi yok." />}
        </Kart>
        <Kart baslik="En çok görüntülenen sayfalar" ikon={<Eye size={16} />}>
          {topSayfa.length ? <BarListe veri={topSayfa} /> : <Bos metin="Henüz sayfa görüntüleme yok." />}
        </Kart>
        <Kart baslik="En çok bakılan ürünler" ikon={<Package size={16} />}>
          {topUrun.length ? <BarListe veri={topUrun} /> : <Bos metin="Henüz ürün görüntüleme yok." />}
        </Kart>
        <Kart baslik="En çok aranan" ikon={<SearchIcon size={16} />}>
          {topArama.length ? <BarListe veri={topArama} /> : <Bos metin="Henüz arama yok." />}
        </Kart>
      </div>

      <Kart baslik="Son ziyaretçiler" ikon={<Users size={16} />}>
        {sonOturumlar.length ? (
          <div className="space-y-2">{sonOturumlar.map((o) => <OturumSatiri key={o.oturum_id} o={o} />)}</div>
        ) : <Bos metin="Henüz ziyaret yok." />}
      </Kart>
    </div>
  )
}

function Canli({ olaylarTum, email }) {
  const esik = Date.now() - 5 * 60 * 1000
  const sonOlaylar = (olaylarTum || []).filter((o) => new Date(o.created_at).getTime() >= esik)
  const aktifZiyaretci = oturumlariCikar(sonOlaylar)
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-3xl p-5 flex items-center gap-4">
        <span className="relative flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/70" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-white" />
        </span>
        <div>
          <div className="text-4xl font-extrabold tabular-nums">{aktifZiyaretci.length}</div>
          <div className="text-sm opacity-90">şu an sitede (son 5 dakika) · 15 sn'de bir yenilenir</div>
        </div>
      </div>

      <Kart baslik="Aktif ziyaretçiler" ikon={<Radio size={16} />}>
        {aktifZiyaretci.length ? (
          <div className="space-y-2">
            {aktifZiyaretci.map((o) => {
              const son = o.olaylar[o.olaylar.length - 1]
              return (
                <div key={o.oturum_id} className="flex items-center gap-3 py-2 border-b border-base-200 last:border-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <CihazIkon tur={o.cihaz} size={16} className="text-base-content/50 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {son?.baslik || TUR_ETIKET[son?.tur] || 'Sayfa'} <span className="text-base-content/40 font-normal">· {son?.yol || ''}</span>
                    </div>
                    <div className="text-xs text-base-content/50 flex items-center gap-1.5 flex-wrap">
                      <MapPin size={11} />{o.sehir || '—'}, {ulkeAd(o.ulke)} · {o.kaynak}
                      {email(o.kullanici_id) && <span className="badge badge-ghost badge-xs">{email(o.kullanici_id)}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-base-content/40 shrink-0">{oncekiZaman(son?.created_at)}</span>
                </div>
              )
            })}
          </div>
        ) : <Bos metin="Şu an aktif ziyaretçi yok." />}
      </Kart>
    </div>
  )
}

function Ziyaretciler({ oturumlar, email }) {
  const [ara, setAra] = useState('')
  const [cihazF, setCihazF] = useState('hepsi')
  const [uyeF, setUyeF] = useState('hepsi')
  const [sayfa, setSayfa] = useState(1)
  const BOYUT = 20

  const suzulmus = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase('tr')
    return oturumlar.filter((o) => {
      if (cihazF !== 'hepsi' && o.cihaz !== cihazF) return false
      if (uyeF === 'uye' && !o.kullanici_id) return false
      if (uyeF === 'misafir' && o.kullanici_id) return false
      if (q && ![o.sehir, ulkeAd(o.ulke), o.kaynak, o.cihaz, email(o.kullanici_id)]
        .filter(Boolean).join(' ').toLocaleLowerCase('tr').includes(q)) return false
      return true
    })
  }, [oturumlar, ara, cihazF, uyeF, email])

  useEffect(() => { setSayfa(1) }, [ara, cihazF, uyeF])

  const toplamSayfa = Math.max(1, Math.ceil(suzulmus.length / BOYUT))
  const aktifSayfa = Math.min(sayfa, toplamSayfa)
  const dilim = suzulmus.slice((aktifSayfa - 1) * BOYUT, aktifSayfa * BOYUT)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Şehir, kaynak, cihaz, e-posta ara…"
            className="input input-sm input-bordered w-full pl-9 rounded-xl" />
        </div>
        <select value={cihazF} onChange={(e) => setCihazF(e.target.value)} className="select select-sm select-bordered rounded-xl">
          <option value="hepsi">Tüm cihazlar</option>
          <option value="mobil">Mobil</option>
          <option value="masaüstü">Masaüstü</option>
          <option value="tablet">Tablet</option>
        </select>
        <select value={uyeF} onChange={(e) => setUyeF(e.target.value)} className="select select-sm select-bordered rounded-xl">
          <option value="hepsi">Üye + Misafir</option>
          <option value="uye">Sadece üyeler</option>
          <option value="misafir">Sadece misafirler</option>
        </select>
        <span className="text-xs text-base-content/50 ml-auto whitespace-nowrap">{suzulmus.length} oturum</span>
      </div>

      {dilim.length ? (
        <>
          <div className="space-y-2">{dilim.map((o) => <OturumSatiri key={o.oturum_id} o={o} email={email} acilir />)}</div>
          {toplamSayfa > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button disabled={aktifSayfa <= 1} onClick={() => setSayfa(aktifSayfa - 1)}
                className="btn btn-sm btn-ghost rounded-xl disabled:opacity-40">‹ Önceki</button>
              <span className="text-xs text-base-content/60 tabular-nums">Sayfa <b>{aktifSayfa}</b> / {toplamSayfa}</span>
              <button disabled={aktifSayfa >= toplamSayfa} onClick={() => setSayfa(aktifSayfa + 1)}
                className="btn btn-sm btn-ghost rounded-xl disabled:opacity-40">Sonraki ›</button>
            </div>
          )}
        </>
      ) : <Kart baslik=""><Bos metin="Bu filtrede oturum yok." /></Kart>}
    </div>
  )
}

function OturumSatiri({ o, email, acilir }) {
  const [acik, setAcik] = useState(false)
  const eposta = email?.(o.kullanici_id)
  return (
    <div className="border border-base-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => acilir && setAcik((x) => !x)}
        className={`w-full flex items-center gap-3 p-3 text-left ${acilir ? 'hover:bg-base-200/60' : ''} transition`}
      >
        <div className="w-9 h-9 rounded-xl bg-base-200 grid place-items-center shrink-0">
          <CihazIkon tur={o.cihaz} size={17} className="text-base-content/60" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1"><MapPin size={12} className="text-base-content/40" />{o.sehir || '—'}, {ulkeAd(o.ulke)}</span>
            <span className="badge badge-ghost badge-xs">{o.kaynak}</span>
            {eposta && <span className="badge badge-primary badge-xs">{eposta}</span>}
          </div>
          <div className="text-xs text-base-content/50 mt-0.5">
            {o.olaylar.length} olay · {kisaSure(o.sure)} · {o.tarayici}/{o.isletim}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-base-content/50">{oncekiZaman(o.bitis)}</div>
          {acilir && <ChevronDown size={16} className={`ml-auto text-base-content/40 transition ${acik ? 'rotate-180' : ''}`} />}
        </div>
      </button>
      {acik && (
        <div className="border-t border-base-200 bg-base-200/30 px-3 py-2">
          <ol className="relative border-l-2 border-base-300 ml-3 space-y-2 py-1">
            {o.olaylar.map((e, i) => (
              <li key={i} className="ml-4 relative">
                <span className={`absolute -left-[1.42rem] top-1 w-2.5 h-2.5 rounded-full ${TUR_RENK[e.tur] || 'bg-base-content/30'}`} />
                <div className="text-sm">
                  <span className="badge badge-xs badge-ghost mr-1.5">{TUR_ETIKET[e.tur] || e.tur}</span>
                  {e.baslik || e.yol}
                </div>
                <div className="text-[11px] text-base-content/40">{tarih(e.created_at)}</div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function Kaynaklar({ oturumlar }) {
  const kaynak = useMemo(() => enCok(oturumlar, 'kaynak', 12), [oturumlar])
  const referrer = useMemo(() => {
    const r = oturumlar.map((o) => (o.olaylar.find((e) => e.referrer)?.referrer) || null).filter(Boolean)
    return enCok(r.map((x) => ({ x })), 'x', 10)
  }, [oturumlar])
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Kart baslik="Kaynağa göre ziyaretçi" ikon={<ArrowUpRight size={16} />}>
        {kaynak.length ? <BarListe veri={kaynak} /> : <Bos metin="Henüz veri yok." />}
      </Kart>
      <Kart baslik="Yönlendiren siteler (referrer)" ikon={<Globe size={16} />}>
        {referrer.length ? <BarListe veri={referrer} /> : <Bos metin="Doğrudan girişler — yönlendiren site yok." />}
      </Kart>
    </div>
  )
}

function Cografya({ oturumlar }) {
  const sehirler = useMemo(() => enCok(oturumlar.filter((o) => o.sehir), 'sehir', 15), [oturumlar])
  const ulkeler = useMemo(() => enCok(oturumlar.filter((o) => o.ulke), (o) => ulkeAd(o.ulke), 10), [oturumlar])
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Kart baslik="Şehirlere göre ziyaretçi" ikon={<MapPin size={16} />}>
        {sehirler.length ? <BarListe veri={sehirler} /> : <Bos metin="Şehir verisi yok (yayında Cloudflare doldurur)." />}
      </Kart>
      <Kart baslik="Ülkelere göre ziyaretçi" ikon={<Globe size={16} />}>
        {ulkeler.length ? <BarListe veri={ulkeler} /> : <Bos metin="Ülke verisi yok (yayında Cloudflare doldurur)." />}
      </Kart>
    </div>
  )
}

function Goruntuleme({ olaylar, v }) {
  const topSayfa = useMemo(() => enCok(olaylar.filter((o) => o.tur === 'sayfa'), 'baslik', 12), [olaylar])
  const topUrun = useMemo(() => enCok(olaylar.filter((o) => o.tur === 'urun'), 'baslik', 12), [olaylar])
  const topFav = useMemo(() => enCok(v.favoriler, 'baslik', 10), [v])
  const topSepet = useMemo(() => enCok(v.sepet, 'baslik', 10), [v])
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Kart baslik="En çok görüntülenen sayfalar" ikon={<Eye size={16} />}>
        {topSayfa.length ? <BarListe veri={topSayfa} /> : <Bos metin="Veri yok." />}
      </Kart>
      <Kart baslik="En çok bakılan ürünler" ikon={<Package size={16} />}>
        {topUrun.length ? <BarListe veri={topUrun} /> : <Bos metin="Veri yok." />}
      </Kart>
      <Kart baslik="En çok favorilenen" ikon={<Heart size={16} />}>
        {topFav.length ? <BarListe veri={topFav} /> : <Bos metin="Henüz favori yok." />}
      </Kart>
      <Kart baslik="En çok sepete eklenen" ikon={<ShoppingCart size={16} />}>
        {topSepet.length ? <BarListe veri={topSepet} /> : <Bos metin="Henüz sepet ürünü yok." />}
      </Kart>
    </div>
  )
}

function Aramalar({ olaylar, v }) {
  const topArama = useMemo(() => enCok(v.aramalar, 'terim', 20), [v])
  const barkodlar = useMemo(() => olaylar.filter((o) => o.tur === 'barkod'), [olaylar])
  const listeler = useMemo(() => olaylar.filter((o) => o.tur === 'liste'), [olaylar])
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat ikon={<SearchIcon size={16} />} n={v.aramalar.length} l="Toplam arama" />
        <MiniStat ikon={<ScanLine size={16} />} n={barkodlar.length} l="Barkod okutma" />
        <MiniStat ikon={<ListChecks size={16} />} n={listeler.length} l="Liste oluşturma" />
        <MiniStat ikon={<Package size={16} />} n={new Set(v.aramalar.map((a) => a.terim)).size} l="Farklı terim" />
      </div>
      <Kart baslik="En çok aranan ürünler" ikon={<SearchIcon size={16} />}>
        {topArama.length ? <BarListe veri={topArama} /> : <Bos metin="Henüz arama kaydı yok." />}
      </Kart>
      {barkodlar.length > 0 && (
        <Kart baslik="Son barkod okutmaları" ikon={<ScanLine size={16} />}>
          <div className="flex flex-wrap gap-2">
            {barkodlar.slice(0, 30).map((b, i) => (
              <span key={i} className="badge badge-outline badge-lg font-mono text-xs">{b.baslik}</span>
            ))}
          </div>
        </Kart>
      )}
    </div>
  )
}

function Kullanicilar({ v }) {
  const buyume = useMemo(() => {
    const gunler = []
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0)
    for (let i = 13; i >= 0; i--) {
      const g = new Date(bugun); g.setDate(g.getDate() - i)
      gunler.push({ g, key: yerelGun(g), deger: 0 })
    }
    v.kullanicilar.forEach((k) => {
      const gun = gunler.find((x) => x.key === yerelGun(k.olusturuldu))
      if (gun) gun.deger += 1
    })
    return gunler
  }, [v])
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat ikon={<UserCircle size={16} />} n={v.kullanicilar.length} l="Toplam üye" />
        <MiniStat ikon={<Shield size={16} />} n={v.kullanicilar.filter((k) => k.rol === 'admin').length} l="Admin" />
        <MiniStat ikon={<Heart size={16} />} n={v.favoriler.length} l="Favori" />
        <MiniStat ikon={<Bell size={16} />} n={v.alarmlar.length} l="Fiyat alarmı" />
      </div>
      <Kart baslik="Yeni üyeler — son 14 gün" ikon={<TrendingUp size={16} />}>
        <SutunGrafik veri={buyume} />
      </Kart>
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
    </div>
  )
}

function Ayarlar() {
  return (
    <div className="space-y-3">
      <Kart baslik="Kurulum durumu" ikon={<Settings size={16} />}>
        <ul className="text-sm space-y-2 text-base-content/70">
          <li>✅ Ziyaretçi takibi <b>anonim</b> ve KVKK dostu çalışır — ham IP saklanmaz.</li>
          <li>📍 Coğrafya (şehir/ülke) yalnızca <b>yayında</b> (Cloudflare) dolar; yerelde boş kalır.</li>
          <li>🗄️ Tablo yoksa Supabase'de <code>izleme-kurulum.sql</code> çalıştır.</li>
          <li>🧹 Eski kayıtları temizlemek için SQL dosyasındaki 90 gün satırını kullanabilirsin.</li>
        </ul>
      </Kart>
    </div>
  )
}

// ======================= ORTAK UI =======================
function Tile({ grad, icon, n, l, canli, metin }) {
  return (
    <div className={`rounded-3xl p-4 bg-gradient-to-br ${grad} text-white shadow-sm relative overflow-hidden`}>
      {canli && n > 0 && <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-white/90 animate-pulse" />}
      <div className="flex items-center gap-1.5 text-xs opacity-90">{icon} {l}</div>
      <div className={`${metin ? 'text-2xl' : 'text-3xl'} font-extrabold mt-2 tabular-nums`}>{n}</div>
    </div>
  )
}
function MiniStat({ ikon, n, l }) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-xs text-base-content/50">{ikon} {l}</div>
      <div className="text-2xl font-extrabold mt-1 tabular-nums">{n}</div>
    </div>
  )
}
function Kart({ baslik, ikon, children }) {
  return (
    <section className="bg-base-100 border border-base-300 rounded-3xl p-4">
      {baslik && <h2 className="text-sm font-semibold text-base-content/70 mb-3 flex items-center gap-1.5">{ikon} {baslik}</h2>}
      {children}
    </section>
  )
}
function Bos({ metin }) {
  return <div className="text-xs text-base-content/40 py-6 text-center">{metin}</div>
}
function BarListe({ veri }) {
  const max = Math.max(...veri.map((d) => d.count), 1)
  return (
    <div className="space-y-2">
      {veri.map((d, i) => (
        <div key={i} className="flex items-center gap-2" title={`${d.label}: ${d.count}`}>
          <div className="w-28 sm:w-44 text-xs truncate shrink-0" title={d.label}>{d.label}</div>
          <div className="flex-1 bg-base-200 rounded-full h-5 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.max(6, (d.count / max) * 100)}%` }} />
          </div>
          <div className="w-8 text-right text-xs font-semibold tabular-nums shrink-0">{d.count}</div>
        </div>
      ))}
    </div>
  )
}
// Günlük sütun grafik — bar = deger; tooltip'te alt (ör. sayfa görüntüleme)
function SutunGrafik({ veri, altAd }) {
  const max = Math.max(...veri.map((d) => d.deger), 1)
  const gunAd = (g) => g.toLocaleDateString('tr-TR', { day: '2-digit' })
  return (
    <div className="flex items-end gap-1 h-36">
      {veri.map((d, i) => (
        <div key={i} className="flex-1 h-full flex flex-col items-center gap-1 group"
          title={`${d.g.toLocaleDateString('tr-TR')}: ${d.deger} ziyaretçi${d.alt != null ? ` · ${d.alt} ${altAd || ''}` : ''}`}>
          {/* Değer — her zaman görünür, net */}
          <div className={`h-4 text-[11px] font-bold tabular-nums ${d.deger > 0 ? 'text-base-content/80' : 'text-transparent'}`}>
            {d.deger > 0 ? d.deger : '0'}
          </div>
          <div className="relative w-full flex-1 bg-base-200 rounded-md overflow-hidden">
            <div
              className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-primary to-green-400 rounded-md transition-all group-hover:opacity-80"
              style={{ height: `${Math.max(d.deger ? 6 : 0, (d.deger / max) * 100)}%` }}
            />
          </div>
          <div className="text-[10px] font-medium text-base-content/50">{gunAd(d.g)}</div>
        </div>
      ))}
    </div>
  )
}

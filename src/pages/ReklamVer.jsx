import { useEffect, useState } from 'react'
import {
  Megaphone, Users, Eye, MapPin, TrendingUp, Mail, MessageCircle,
  Check, Target, Sparkles, ShoppingBag, ArrowRight,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// --- İLETİŞİM (istersen değiştir) ---
const EPOSTA = 'aflazercan@gmail.com'
const WHATSAPP = '' // ör. '905385900295' — dolu olursa WhatsApp butonu görünür

const sayi = (n) => new Intl.NumberFormat('tr-TR').format(Math.max(0, Math.round(n || 0)))

export default function ReklamVer() {
  const [ist, setIst] = useState(null)
  const [yuklendi, setYuklendi] = useState(false)

  useEffect(() => {
    let iptal = false
    ;(async () => {
      try {
        const { data, error } = await supabase.rpc('acik_istatistik')
        if (!iptal && !error && data) setIst(data)
      } catch { /* istatistik yoksa sorun değil */ }
      if (!iptal) setYuklendi(true)
    })()
    return () => { iptal = true }
  }, [])

  const mailto = `mailto:${EPOSTA}?subject=${encodeURIComponent('neredeucuz — Reklam vermek istiyorum')}&body=${encodeURIComponent('Merhaba, neredeucuz’da reklam vermek istiyorum. Detayları konuşabilir miyiz?')}`
  const wa = WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Merhaba, neredeucuz’da reklam vermek istiyorum.')}` : null

  const kartlar = [
    { ikon: <Users size={20} />, deger: ist ? sayi(ist.ziyaretci30) : '—', etiket: 'Aylık ziyaretçi', grad: 'from-violet-500 to-purple-600' },
    { ikon: <Eye size={20} />, deger: ist ? sayi(ist.goruntuleme30) : '—', etiket: 'Aylık görüntüleme', grad: 'from-blue-500 to-indigo-600' },
    { ikon: <MapPin size={20} />, deger: ist ? sayi(ist.sehirSayisi) : '—', etiket: 'Ulaşılan şehir', grad: 'from-emerald-500 to-green-600' },
    { ikon: <TrendingUp size={20} />, deger: ist ? sayi(ist.toplamZiyaretci) : '—', etiket: 'Toplam ziyaretçi', grad: 'from-amber-400 to-orange-500' },
  ]

  const topSehir = Array.isArray(ist?.topSehirler) ? ist.topSehirler : []
  const maxSehir = Math.max(...topSehir.map((s) => s.sayi), 1)

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-4">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary text-white p-6 sm:p-10">
        <Megaphone className="absolute -right-6 -top-6 opacity-10" size={160} />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-semibold mb-4">
            <Sparkles size={13} /> Reklam Fırsatı
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Markanı <span className="underline decoration-white/40">binlerce alışverişçiye</span> göster
          </h1>
          <p className="mt-3 text-white/90 max-w-xl">
            neredeucuz, İskenderun başta olmak üzere Türkiye’de market fiyatı karşılaştıran
            alışverişçilerin uğrak noktası. Reklamın tam alışveriş anında, doğru kişilerin karşısına çıkar.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={mailto} className="btn bg-white text-primary hover:bg-white/90 border-0 rounded-xl font-bold">
              <Mail size={18} /> Hemen iletişime geç
            </a>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn bg-white/15 hover:bg-white/25 text-white border-0 rounded-xl">
                <MessageCircle size={18} /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {/* CANLI İSTATİSTİK */}
      <section>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><TrendingUp size={18} className="text-primary" /> Canlı rakamlarla neredeucuz</h2>
        <p className="text-sm text-base-content/50 mb-4">Gerçek ziyaretçi verisi — reklamın kaç kişiye ulaşacağını kendin gör.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kartlar.map((k, i) => (
            <div key={i} className={`rounded-3xl p-4 bg-gradient-to-br ${k.grad} text-white shadow-sm`}>
              <div className="flex items-center gap-1.5 text-xs opacity-90">{k.ikon}</div>
              <div className="text-3xl font-extrabold mt-2 tabular-nums">{yuklendi ? k.deger : '…'}</div>
              <div className="text-xs opacity-90 mt-0.5">{k.etiket}</div>
            </div>
          ))}
        </div>
        {yuklendi && !ist && (
          <p className="text-xs text-base-content/40 mt-3">
            (İstatistik verisi henüz hazır değil — Supabase’de <code>reklam-istatistik.sql</code> çalıştırılınca canlı rakamlar burada görünür.)
          </p>
        )}

        {topSehir.length > 0 && (
          <div className="mt-4 bg-base-100 border border-base-300 rounded-3xl p-4">
            <h3 className="text-sm font-semibold text-base-content/70 mb-3 flex items-center gap-1.5"><MapPin size={15} /> Reklamın en çok bu şehirlerde görünür</h3>
            <div className="space-y-2">
              {topSehir.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-24 sm:w-32 text-sm truncate shrink-0">{s.ad}</div>
                  <div className="flex-1 bg-base-200 rounded-full h-4 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.max(8, (s.sayi / maxSehir) * 100)}%` }} />
                  </div>
                  <div className="w-10 text-right text-xs font-semibold tabular-nums shrink-0">{sayi(s.sayi)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* NEDEN */}
      <section>
        <h2 className="text-lg font-bold mb-4">Neden neredeucuz’da reklam?</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { ik: <Target size={20} />, b: 'Alışveriş anında', a: 'Kullanıcılar tam ürün ararken reklamınla karşılaşır — satın alma niyeti en yüksek an.' },
            { ik: <MapPin size={20} />, b: 'Yerel hedefleme', a: 'İskenderun ve bölgendeki alışverişçilere doğrudan ulaş — yerel işletmeler için ideal.' },
            { ik: <ShoppingBag size={20} />, b: 'Uygun & esnek', a: 'Küçük işletmeye de uygun paketler. Afişini biz yayınlarız, istediğin zaman güncelleriz.' },
          ].map((x, i) => (
            <div key={i} className="bg-base-100 border border-base-300 rounded-3xl p-5">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3">{x.ik}</div>
              <div className="font-bold">{x.b}</div>
              <p className="text-sm text-base-content/60 mt-1">{x.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* REKLAM ALANLARI */}
      <section className="bg-base-100 border border-base-300 rounded-3xl p-5">
        <h2 className="text-lg font-bold mb-3">Reklamın nerede görünür?</h2>
        <ul className="space-y-2 text-sm text-base-content/70">
          {[
            'Ana sayfa ve arama sonuçlarının arasında (en yoğun trafik)',
            'Ürün ve sepet sayfalarında',
            'Masaüstünde sağ/sol yan reklam sütunlarında',
            'Her sayfanın altında görünür afiş alanında',
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-2"><Check size={16} className="text-primary mt-0.5 shrink-0" /> {t}</li>
          ))}
        </ul>
      </section>

      {/* İLETİŞİM */}
      <section className="rounded-3xl bg-base-200 border border-base-300 p-6 sm:p-8 text-center">
        <h2 className="text-2xl font-extrabold">Reklam vermeye hazır mısın?</h2>
        <p className="text-base-content/60 mt-2 max-w-lg mx-auto">
          Bütçene uygun bir reklam planı için bize yaz. Aynı gün dönüş yapalım.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 justify-center">
          <a href={mailto} className="btn btn-primary rounded-xl font-bold">
            <Mail size={18} /> {EPOSTA}
          </a>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-success text-white rounded-xl">
              <MessageCircle size={18} /> WhatsApp’tan yaz
            </a>
          )}
        </div>
        <p className="text-xs text-base-content/40 mt-6">Bu platform <b>Ercan Aflaz</b> tarafından geliştirilmiştir.</p>
      </section>
    </div>
  )
}

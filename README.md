# neredeucuz

Barkodu tara ya da ürün adı yaz; ürünün **A101, BİM, Migros, ŞOK, CarrefourSA,
HAKMAR, Tarım Kredi** marketlerinde **en ucuz nerede** olduğunu anında gör.
Konumunla sana yakın fiyatlar, favori ürünler ve fiyat alarmı.

Veri kaynağı: **marketfiyati.org.tr** (TÜBİTAK) — kamuya açık, kimlik doğrulaması
gerektirmeyen JSON API. Bu uygulama veriyi kazımaz; hazır kaynağı sunar.

## Teknoloji

Vite + React 18 · Tailwind v4 + daisyUI v5 · Supabase (Auth + favori/alarm) ·
Cloudflare Pages (yayın + API proxy) · PWA.

## Kurulum

```bash
npm install
cp .env.example .env   # değerleri doldur
npm run dev            # http://localhost:5173
```

`.env` içine Supabase bilgilerini yaz (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`).
Supabase → SQL Editor'de `supabase/schema.sql` dosyasını bir kez çalıştır.
Supabase → Authentication → Providers: e-posta ile giriş açık olsun.

## Mimarî notu — CORS / API proxy

marketfiyati API'sine tarayıcıdan doğrudan gidilemez (CORS). Bu yüzden uygulama
kendi origin'inden `/api/mf/<endpoint>` çağırır:

- **Yerel geliştirme:** `vite.config.js` içindeki proxy `/api/mf` → `api.marketfiyati.org.tr/api/v2`.
- **Yayın (Cloudflare Pages):** `functions/api/mf/[[path]].js` aynı yönlendirmeyi sunucu tarafında yapar.

## Yayın (Cloudflare Pages)

1. GitHub'a push et (`./yayinla.ps1 "mesaj"`).
2. Cloudflare → Workers & Pages → Create → Pages → repoyu bağla.
3. Framework preset: **React (Vite)**, build `npm run build`, output `dist`.
4. Environment variables'a `VITE_SUPABASE_URL` ve `VITE_SUPABASE_KEY` ekle.
   (Cloudflare `.env` dosyanı görmez.)

Pages Functions (`functions/`) otomatik yayınlanır; ekstra ayar gerekmez.

## Google AdSense (para kazanma)

AdSense yalnızca **web** içindir (bu PWA web olduğu için uygun).
1. AdSense hesabı aç, alan adını ekle/onaylat.
2. `index.html` içindeki AdSense script yorumunu aç, `ca-pub-XXXX` yaz.
3. `.env` / Cloudflare'e `VITE_ADSENSE_CLIENT`, `VITE_ADSENSE_SLOT_LIST`,
   `VITE_ADSENSE_SLOT_PRODUCT` ekle. Boşsa reklam alanları yer tutucu görünür.

> İleride gerçek native mobil uygulama (Play Store/App Store) yaparsan reklam
> için **AdMob** kullanılır; AdSense native uygulamada çalışmaz.

## Yol haritası (sonraki adımlar)

- Fiyat alarmlarını periyodik kontrol eden Supabase Edge Function + Web Push.
- Alışveriş listesi: "tüm sepetim en ucuz hangi markette / nasıl bölersem ucuz".
- Fiyat geçmişi grafiği.
- Elektronik (Teknosa, MediaMarkt) için ayrı veri kaynağı entegrasyonu.

## Yasal not

Fiyatlar marketfiyati.org.tr verisine dayanır ve anlık değişebilir. Ticari
kullanım ve reklam geliri için veri kaynağının kullanım şartlarını netleştir.

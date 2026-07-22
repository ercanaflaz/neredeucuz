-- ============================================================
-- neredeucuz — ZİYARETÇİ / ANALİTİK TAKİP (admin-kurulum.sql'den SONRA çalıştır)
-- Anonim, KVKK dostu: ham IP saklanmaz; sadece şehir/ülke/cihaz/kaynak tutulur.
-- "Kim nereden girdi, neye baktı, ne zaman" oturum bazında görünür.
-- ============================================================

create table if not exists public.olaylar (
  id            bigint generated always as identity primary key,
  ziyaretci_id  text not null,                 -- anonim cihaz kimliği (localStorage)
  oturum_id     text not null,                 -- oturum kimliği (30 dk hareketsizlikte yenilenir)
  tur           text not null,                 -- 'sayfa'|'urun'|'arama'|'barkod'|'liste'|'sepet'|'kurulum'|'oturum'
  yol           text,                          -- '#/', '#/sepet' ...
  baslik        text,                          -- ürün adı / arama terimi / sayfa adı
  detay         jsonb,                         -- ek veri (fiyat, marka, sonuç sayısı ...)
  kullanici_id  uuid references auth.users (id) on delete set null,  -- giriş yaptıysa
  kaynak        text,                          -- 'Direkt'|'Google'|'Instagram'|host ...
  referrer      text,
  utm           jsonb,
  ulke          text,
  sehir         text,
  bolge         text,
  enlem         double precision,
  boylam        double precision,
  cihaz         text,                          -- 'mobil'|'masaüstü'|'tablet'
  tarayici      text,
  isletim       text,
  ekran         text,
  dil           text,
  created_at    timestamptz not null default now()
);
alter table public.olaylar enable row level security;

-- Herkes (misafir dahil) olay loglayabilir; SADECE admin okur.
drop policy if exists "olay ekle"  on public.olaylar;
drop policy if exists "olay admin" on public.olaylar;
create policy "olay ekle"  on public.olaylar for insert with check (true);
create policy "olay admin"  on public.olaylar for select using (public.is_admin());

create index if not exists olaylar_zaman_idx     on public.olaylar (created_at desc);
create index if not exists olaylar_ziyaretci_idx on public.olaylar (ziyaretci_id);
create index if not exists olaylar_oturum_idx    on public.olaylar (oturum_id);
create index if not exists olaylar_tur_idx        on public.olaylar (tur);

-- İsteğe bağlı: 90 günden eski olayları silmek için (elle ya da cron ile çalıştır)
-- delete from public.olaylar where created_at < now() - interval '90 days';

-- ============================================================
-- nerdeucuz — TAM KURULUM (tek dosya)
-- Supabase → SQL Editor → hepsini yapıştır → RUN.
-- Favoriler + Fiyat Alarmları + Sepet + Akıllı Liste tabloları, RLS ile.
-- (Uygulama bu tablolar olmadan da çalışır; bunlar cihazlar arası senkron içindir.)
-- ============================================================

-- ---------- FAVORİLER ----------
create table if not exists public.favoriler (
  id           uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references auth.users (id) on delete cascade,
  urun_id      text not null,
  baslik       text,
  marka        text,
  gorsel       text,
  eklendi      timestamptz not null default now(),
  unique (kullanici_id, urun_id)
);
alter table public.favoriler enable row level security;
create policy "favori sec"  on public.favoriler for select using (auth.uid() = kullanici_id);
create policy "favori ekle" on public.favoriler for insert with check (auth.uid() = kullanici_id);
create policy "favori sil"  on public.favoriler for delete using (auth.uid() = kullanici_id);

-- ---------- FİYAT ALARMLARI ----------
create table if not exists public.fiyat_alarmlari (
  id           uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references auth.users (id) on delete cascade,
  urun_id      text not null,
  baslik       text,
  hedef_fiyat  numeric not null,
  son_fiyat    numeric,
  aktif        boolean not null default true,
  olusturuldu  timestamptz not null default now()
);
alter table public.fiyat_alarmlari enable row level security;
create policy "alarm sec"      on public.fiyat_alarmlari for select using (auth.uid() = kullanici_id);
create policy "alarm ekle"     on public.fiyat_alarmlari for insert with check (auth.uid() = kullanici_id);
create policy "alarm guncelle" on public.fiyat_alarmlari for update using (auth.uid() = kullanici_id) with check (auth.uid() = kullanici_id);
create policy "alarm sil"      on public.fiyat_alarmlari for delete using (auth.uid() = kullanici_id);

-- ---------- SEPET ----------
create table if not exists public.sepet (
  id           uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references auth.users (id) on delete cascade,
  urun_id      text not null,
  baslik       text,
  marka        text,
  gorsel       text,
  adet         integer not null default 1 check (adet > 0),
  depots       jsonb not null default '[]'::jsonb,
  eklendi      timestamptz not null default now(),
  unique (kullanici_id, urun_id)
);
alter table public.sepet enable row level security;
create policy "sepet sec"      on public.sepet for select using (auth.uid() = kullanici_id);
create policy "sepet ekle"     on public.sepet for insert with check (auth.uid() = kullanici_id);
create policy "sepet guncelle" on public.sepet for update using (auth.uid() = kullanici_id) with check (auth.uid() = kullanici_id);
create policy "sepet sil"      on public.sepet for delete using (auth.uid() = kullanici_id);

-- ---------- AKILLI SEPET LİSTESİ ----------
create table if not exists public.akilli_liste (
  kullanici_id uuid primary key references auth.users (id) on delete cascade,
  urunler      jsonb not null default '[]'::jsonb,
  guncelleme   timestamptz not null default now()
);
alter table public.akilli_liste enable row level security;
create policy "akilli sec"      on public.akilli_liste for select using (auth.uid() = kullanici_id);
create policy "akilli ekle"     on public.akilli_liste for insert with check (auth.uid() = kullanici_id);
create policy "akilli guncelle" on public.akilli_liste for update using (auth.uid() = kullanici_id) with check (auth.uid() = kullanici_id);
create policy "akilli sil"      on public.akilli_liste for delete using (auth.uid() = kullanici_id);

-- ---------- İNDEKSLER ----------
create index if not exists favoriler_kullanici_idx on public.favoriler (kullanici_id);
create index if not exists alarm_kullanici_idx    on public.fiyat_alarmlari (kullanici_id);
create index if not exists sepet_kullanici_idx    on public.sepet (kullanici_id);

-- Bitti. Authentication → Providers → Email: "Confirm email" KAPALI olursa
-- kullanıcı e-posta doğrulamadan hemen giriş yapar (MVP için pratik).

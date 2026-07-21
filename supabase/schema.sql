-- nerdeucuz — Supabase şeması
-- Supabase → SQL Editor'de bir kez çalıştır.
-- Her kullanıcı yalnızca kendi favori ve alarmlarını görür/değiştirir (RLS).

-- ============ FAVORİLER ============
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

create policy "favori sec" on public.favoriler
  for select using (auth.uid() = kullanici_id);

create policy "favori ekle" on public.favoriler
  for insert with check (auth.uid() = kullanici_id);

create policy "favori sil" on public.favoriler
  for delete using (auth.uid() = kullanici_id);

-- ============ FİYAT ALARMLARI ============
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

create policy "alarm sec" on public.fiyat_alarmlari
  for select using (auth.uid() = kullanici_id);

create policy "alarm ekle" on public.fiyat_alarmlari
  for insert with check (auth.uid() = kullanici_id);

create policy "alarm guncelle" on public.fiyat_alarmlari
  for update using (auth.uid() = kullanici_id) with check (auth.uid() = kullanici_id);

create policy "alarm sil" on public.fiyat_alarmlari
  for delete using (auth.uid() = kullanici_id);

-- Hızlı sorgu için indeksler
create index if not exists favoriler_kullanici_idx on public.favoriler (kullanici_id);
create index if not exists alarm_kullanici_idx on public.fiyat_alarmlari (kullanici_id);

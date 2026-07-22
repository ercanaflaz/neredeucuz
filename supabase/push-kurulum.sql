-- ============================================================
-- neredeucuz — PUSH BİLDİRİM ABONELİKLERİ (admin-kurulum.sql'den SONRA)
-- Tarayıcı push aboneliklerini saklar. Gönderim sunucuda (Pages Function).
-- ============================================================

create table if not exists public.push_abonelikleri (
  id           bigint generated always as identity primary key,
  endpoint     text unique not null,           -- push servisi adresi (tekil)
  abonelik     jsonb not null,                 -- tam PushSubscription JSON'u
  kullanici_id uuid references auth.users (id) on delete set null,
  cihaz        text,                           -- 'mobil'|'masaüstü'|'tablet'
  created_at   timestamptz not null default now()
);
alter table public.push_abonelikleri enable row level security;

-- Herkes abone olabilir/güncelleyebilir/kaldırabilir (endpoint tahmin edilemez).
-- Sadece admin listeyi okur; gönderim ise sunucuda service key ile yapılır.
drop policy if exists "push ekle"     on public.push_abonelikleri;
drop policy if exists "push guncelle" on public.push_abonelikleri;
drop policy if exists "push sil"      on public.push_abonelikleri;
drop policy if exists "push admin"    on public.push_abonelikleri;
create policy "push ekle"     on public.push_abonelikleri for insert with check (true);
create policy "push guncelle" on public.push_abonelikleri for update using (true) with check (true);
create policy "push sil"      on public.push_abonelikleri for delete using (true);
create policy "push admin"    on public.push_abonelikleri for select using (public.is_admin());

create index if not exists push_kullanici_idx on public.push_abonelikleri (kullanici_id);

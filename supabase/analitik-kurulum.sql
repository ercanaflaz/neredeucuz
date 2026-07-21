-- neredeucuz — ANALİTİK: arama kayıtları (admin-kurulum.sql'den SONRA çalıştır; is_admin() gerekir)
create table if not exists public.aramalar (
  id           bigint generated always as identity primary key,
  terim        text not null,
  kullanici_id uuid references auth.users (id) on delete set null,
  olusturuldu  timestamptz not null default now()
);
alter table public.aramalar enable row level security;

-- Herkes (misafir dahil) arama loglayabilir; sadece admin okur.
drop policy if exists "arama ekle" on public.aramalar;
create policy "arama ekle" on public.aramalar for insert with check (true);
drop policy if exists "arama admin" on public.aramalar;
create policy "arama admin" on public.aramalar for select using (public.is_admin());

create index if not exists aramalar_terim_idx on public.aramalar (terim);
create index if not exists aramalar_zaman_idx on public.aramalar (olusturuldu);

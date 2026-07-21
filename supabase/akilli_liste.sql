-- nerdeucuz — Akıllı Sepet kayıtlı listesi (schema.sql'den sonra çalıştır).
-- Her kullanıcının tek bir kayıtlı listesi vardır (jsonb). RLS: sadece kendisi.

create table if not exists public.akilli_liste (
  kullanici_id uuid primary key references auth.users (id) on delete cascade,
  urunler      jsonb not null default '[]'::jsonb, -- [{id,terim,adet,tercihMarka,istenmeyenMarkalar,istenmeyenUrunler}]
  guncelleme   timestamptz not null default now()
);

alter table public.akilli_liste enable row level security;

create policy "akilli sec" on public.akilli_liste
  for select using (auth.uid() = kullanici_id);
create policy "akilli ekle" on public.akilli_liste
  for insert with check (auth.uid() = kullanici_id);
create policy "akilli guncelle" on public.akilli_liste
  for update using (auth.uid() = kullanici_id) with check (auth.uid() = kullanici_id);
create policy "akilli sil" on public.akilli_liste
  for delete using (auth.uid() = kullanici_id);

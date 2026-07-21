-- neredeucuz — Kayıtlı listeler ("Listelerim"). tam-kurulum.sql'den sonra çalıştır.
create table if not exists public.kayitli_listeler (
  id           uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references auth.users (id) on delete cascade,
  ad           text not null,
  urunler      jsonb not null default '[]'::jsonb,
  olusturuldu  timestamptz not null default now()
);
alter table public.kayitli_listeler enable row level security;
create policy "liste sec"      on public.kayitli_listeler for select using (auth.uid() = kullanici_id);
create policy "liste ekle"     on public.kayitli_listeler for insert with check (auth.uid() = kullanici_id);
create policy "liste guncelle" on public.kayitli_listeler for update using (auth.uid() = kullanici_id) with check (auth.uid() = kullanici_id);
create policy "liste sil"      on public.kayitli_listeler for delete using (auth.uid() = kullanici_id);
create index if not exists kayitli_listeler_kullanici_idx on public.kayitli_listeler (kullanici_id);

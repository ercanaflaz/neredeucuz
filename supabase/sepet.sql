-- nerdeucuz — SEPET tablosu (schema.sql'den sonra bir kez çalıştır).
-- Üye kullanıcıların sepeti burada saklanır; her kullanıcı yalnızca kendi
-- sepetini görür/değiştirir (RLS). Anonim kullanıcı sepeti tarayıcıda (localStorage) tutulur.

create table if not exists public.sepet (
  id           uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references auth.users (id) on delete cascade,
  urun_id      text not null,
  baslik       text,
  marka        text,
  gorsel       text,
  adet         integer not null default 1 check (adet > 0),
  depots       jsonb not null default '[]'::jsonb, -- [{market, price, unitPrice}] anlık snapshot
  eklendi      timestamptz not null default now(),
  unique (kullanici_id, urun_id)
);

alter table public.sepet enable row level security;

create policy "sepet sec" on public.sepet
  for select using (auth.uid() = kullanici_id);

create policy "sepet ekle" on public.sepet
  for insert with check (auth.uid() = kullanici_id);

create policy "sepet guncelle" on public.sepet
  for update using (auth.uid() = kullanici_id) with check (auth.uid() = kullanici_id);

create policy "sepet sil" on public.sepet
  for delete using (auth.uid() = kullanici_id);

create index if not exists sepet_kullanici_idx on public.sepet (kullanici_id);

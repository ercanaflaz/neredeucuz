-- ============================================================
-- neredeucuz — BROŞÜRLER (market aktüel katalogları)
-- Herkes aktif broşürleri görür; sadece admin ekler/düzenler.
-- ============================================================

create table if not exists public.brosurler (
  id          bigint generated always as identity primary key,
  market      text not null,                 -- 'BİM' | 'A101' | 'ŞOK' | 'Migros' ...
  baslik      text not null,                 -- 'Bu hafta aktüel'
  kategori    text,                          -- 'Süpermarket' | 'Elektronik' ...
  gorsel      text,                          -- kapak görseli URL (opsiyonel)
  link        text,                          -- tıklanınca gidilecek resmi broşür adresi
  tarih_bas   date,                          -- geçerlilik başlangıcı
  tarih_bit   date,                          -- geçerlilik bitişi
  sira        int not null default 0,
  aktif       boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists brosur_aktif_idx on public.brosurler (aktif, sira);
create index if not exists brosur_market_idx on public.brosurler (market);

alter table public.brosurler enable row level security;

drop policy if exists "brosur oku" on public.brosurler;
drop policy if exists "brosur admin yaz" on public.brosurler;

-- Okuma: aktif olanlar herkese; pasifler yalnız admine
create policy "brosur oku" on public.brosurler
  for select to anon, authenticated
  using ( aktif = true or exists (select 1 from public.profiller p where p.id = auth.uid() and p.rol = 'admin') );

-- Yazma/güncelleme/silme: sadece admin
create policy "brosur admin yaz" on public.brosurler
  for all to authenticated
  using ( exists (select 1 from public.profiller p where p.id = auth.uid() and p.rol = 'admin') )
  with check ( exists (select 1 from public.profiller p where p.id = auth.uid() and p.rol = 'admin') );

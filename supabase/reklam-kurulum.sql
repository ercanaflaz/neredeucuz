-- neredeucuz — REKLAM sistemi (admin-kurulum.sql'den SONRA; is_admin() gerekir)
-- Reklamlar admin panelden yönetilir; herkes aktif olanları görür.
create table if not exists public.reklamlar (
  id          uuid primary key default gen_random_uuid(),
  konum       text not null,               -- 'sol' | 'sag' | 'liste' | 'anasayfa'
  baslik      text,
  gorsel      text,                         -- görsel URL (afiş)
  hedef       text,                         -- tıklayınca gidilecek link
  tip         text not null default 'resim',-- 'resim' | 'html'
  html        text,                         -- tip='html' ise gömülecek içerik
  aktif       boolean not null default true,
  sira        int not null default 0,
  olusturuldu timestamptz not null default now()
);
alter table public.reklamlar enable row level security;

-- Herkes aktif reklamları görür; admin hepsini (pasifleri de) görür ve yönetir.
drop policy if exists "reklam gor" on public.reklamlar;
create policy "reklam gor" on public.reklamlar for select using (aktif = true or public.is_admin());
drop policy if exists "reklam ekle" on public.reklamlar;
create policy "reklam ekle" on public.reklamlar for insert with check (public.is_admin());
drop policy if exists "reklam guncelle" on public.reklamlar;
create policy "reklam guncelle" on public.reklamlar for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "reklam sil" on public.reklamlar;
create policy "reklam sil" on public.reklamlar for delete using (public.is_admin());

create index if not exists reklamlar_konum_idx on public.reklamlar (konum, aktif, sira);

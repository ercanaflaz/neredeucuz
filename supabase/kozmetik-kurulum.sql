-- Kozmetik ürünleri tablosu (Gratis vb. mağazalardan çekilen fiyat/stok).
-- Kazıyıcı (scripts/gratis-cek.mjs) url'e göre upsert eder; ileride Rossmann/Watsons
-- de aynı tabloya (barkod ile eşleşerek) eklenebilir.

create table if not exists kozmetik_urunler (
  id          bigint generated always as identity primary key,
  magaza      text not null,                 -- 'Gratis', 'Rossmann', ...
  ad          text not null,
  marka       text,
  barkod      text,                           -- ürün eşleştirme anahtarı
  fiyat       numeric,                        -- normal fiyat (TL)
  kart_fiyat  numeric,                        -- üye/kart fiyatı (varsa)
  stok        text,                           -- 'var' | 'yok'
  gorsel      text,
  url         text not null unique,           -- upsert anahtarı (mağaza ürün linki)
  kategori    text,
  eslesme     text,                           -- mağazalar arası eşleştirme anahtarı (marka+ad normalize)
  guncelleme  timestamptz not null default now()
);

-- Tablo zaten varsa eksik kolonu ekle (tekrar çalıştırmak güvenli)
alter table kozmetik_urunler add column if not exists eslesme text;

create index if not exists kozmetik_barkod_idx on kozmetik_urunler (barkod);
create index if not exists kozmetik_magaza_idx on kozmetik_urunler (magaza);
create index if not exists kozmetik_kategori_idx on kozmetik_urunler (kategori);
create index if not exists kozmetik_eslesme_idx on kozmetik_urunler (eslesme);

-- RLS: herkes okuyabilir, yazma sadece service key (RLS'i baypas eder) ile.
alter table kozmetik_urunler enable row level security;

drop policy if exists kozmetik_select_public on kozmetik_urunler;
create policy kozmetik_select_public
  on kozmetik_urunler for select
  to anon, authenticated
  using (true);

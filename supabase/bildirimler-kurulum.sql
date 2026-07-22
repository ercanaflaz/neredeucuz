-- ============================================================
-- neredeucuz — BİLDİRİMLER (uygulama içi bildirim geçmişi)
-- Gönderilen her push burada da saklanır; kullanıcı "Bildirimler"
-- sayfasında geçmişi görür. Push'a tıklayınca bu sayfaya gelir.
-- ============================================================

create table if not exists public.bildirimler (
  id           bigint generated always as identity primary key,
  kullanici_id uuid references auth.users(id) on delete cascade,  -- NULL = herkese (duyuru)
  baslik       text not null,
  govde        text,
  url          text,
  tur          text not null default 'duyuru',                    -- 'duyuru' | 'fiyat'
  gonderildi   int,                                               -- kaç cihaza ulaştı (rapor)
  toplam       int,                                               -- o an kaç abone vardı (rapor)
  created_at   timestamptz not null default now()
);

-- Var olan tabloya rapor sütunlarını ekle (bir kez)
alter table public.bildirimler add column if not exists gonderildi int;
alter table public.bildirimler add column if not exists toplam int;

create index if not exists bildirim_kul_idx on public.bildirimler (kullanici_id, created_at desc);
create index if not exists bildirim_zaman_idx on public.bildirimler (created_at desc);

alter table public.bildirimler enable row level security;

drop policy if exists "bildirim_select" on public.bildirimler;
drop policy if exists "bildirim_insert_admin" on public.bildirimler;

-- Okuma: herkese açık duyurular (kullanici_id null) + kişinin kendi bildirimleri
create policy "bildirim_select" on public.bildirimler
  for select to anon, authenticated
  using ( kullanici_id is null or kullanici_id = auth.uid() );

-- Ekleme: sadece admin (toplu duyuru). Fiyat alarmı SERVICE KEY ile yazar (RLS baypas).
create policy "bildirim_insert_admin" on public.bildirimler
  for insert to authenticated
  with check ( exists (select 1 from public.profiller p
                       where p.id = auth.uid() and p.rol = 'admin') );

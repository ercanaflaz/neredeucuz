-- ============================================================
-- neredeucuz — OTOMATİK FİYAT ALARMI (fiyat_alarmlari'na ek alanlar)
-- GitHub Actions'taki fiyat-kontrol scripti bu alanları kullanır.
-- ============================================================

-- Bir kez bildirildikten sonra tekrar bildirmemek için işaret + son kontrol zamanı
alter table public.fiyat_alarmlari
  add column if not exists bildirildi boolean not null default false;
alter table public.fiyat_alarmlari
  add column if not exists son_kontrol timestamptz;

create index if not exists alarm_aktif_idx
  on public.fiyat_alarmlari (aktif, bildirildi);

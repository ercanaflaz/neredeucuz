-- neredeucuz — Site ayarları (ör. "Nasıl kullanılır?" video URL'si) + medya deposu.
-- admin-kurulum.sql'den SONRA çalıştır (public.is_admin() gerekiyor).

-- 1) Ayarlar tablosu: herkes okur, sadece admin yazar.
create table if not exists public.ayarlar (
  anahtar     text primary key,
  deger       jsonb,
  guncelleme  timestamptz not null default now()
);
alter table public.ayarlar enable row level security;
drop policy if exists "ayar oku"       on public.ayarlar;
drop policy if exists "ayar yaz admin" on public.ayarlar;
create policy "ayar oku"       on public.ayarlar for select using (true);
create policy "ayar yaz admin"  on public.ayarlar for all    using (public.is_admin()) with check (public.is_admin());

-- 2) Medya deposu (video/görsel yüklemek için). Herkese açık okuma, admin yazar.
insert into storage.buckets (id, name, public)
values ('medya', 'medya', true)
on conflict (id) do nothing;

drop policy if exists "medya oku"           on storage.objects;
drop policy if exists "medya yaz admin"      on storage.objects;
drop policy if exists "medya guncelle admin" on storage.objects;
drop policy if exists "medya sil admin"      on storage.objects;
create policy "medya oku"           on storage.objects for select using (bucket_id = 'medya');
create policy "medya yaz admin"      on storage.objects for insert with check (bucket_id = 'medya' and public.is_admin());
create policy "medya guncelle admin" on storage.objects for update using (bucket_id = 'medya' and public.is_admin());
create policy "medya sil admin"      on storage.objects for delete using (bucket_id = 'medya' and public.is_admin());

-- NOT: Depoyu kurmak istemezsen, videoyu projedeki public/ klasörüne koyup
-- admin'deki URL kutusuna /dosya.mp4 yazman da yeterli.

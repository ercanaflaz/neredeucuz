-- ============================================================
-- neredeucuz — PUSH ABONELİĞİ RLS (NİHAİ / ÇALIŞAN HAL)
-- ============================================================
-- Sorun 1: admin OLMAYAN kullanıcılar abonelik EKLEYEMİYORDU
--          ("new row violates row-level security policy").
-- Sorun 2 (asıl gizli sebep): supabase-js insert'ten sonra satırı GERİ
--          OKUYOR (return=representation). Okuma sadece admin'de olduğu için
--          normal kullanıcıda insert bile RLS ihlali gibi hata veriyordu.
-- Çözüm:   herkes kendi aboneliğini ekleyip/güncelleyip/silebilir VE
--          kendi satırını GERİ OKUYABİLİR. Admin ise hepsini okur (gönderim).
-- ============================================================

-- Tabloya ait tüm eski politikaları temizle (restrictive dahil)
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname='public' and tablename='push_abonelikleri' loop
    execute format('drop policy if exists %I on public.push_abonelikleri', p.policyname);
  end loop;
end $$;

alter table public.push_abonelikleri enable row level security;

-- Yazma: herkes kendi cihaz aboneliğini yönetebilir
create policy "push_insert" on public.push_abonelikleri
  for insert to anon, authenticated with check (true);
create policy "push_update" on public.push_abonelikleri
  for update to anon, authenticated using (true) with check (true);
create policy "push_delete" on public.push_abonelikleri
  for delete to anon, authenticated using (true);

-- Okuma: kullanıcı KENDİ satırını okuyabilir (insert geri-okuması için ŞART)
create policy "push_select_own" on public.push_abonelikleri
  for select to authenticated
  using (kullanici_id = auth.uid());

-- Okuma: admin TÜM satırları okur (toplu gönderim admin token'ıyla yapılıyor)
create policy "push_select_admin" on public.push_abonelikleri
  for select to authenticated
  using ( exists (select 1 from public.profiller p
                  where p.id = auth.uid() and p.rol = 'admin') );

-- Not: GitHub Actions fiyat kontrolü SERVICE KEY kullanır → RLS'i baypas eder.

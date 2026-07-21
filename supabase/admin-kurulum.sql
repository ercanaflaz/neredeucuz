-- ============================================================
-- neredeucuz — ADMIN KURULUM (tam-kurulum.sql'den SONRA çalıştır)
-- Kullanıcı profilleri + admin rolü + admin'in tüm veriyi görmesi.
-- ============================================================

-- ---------- PROFİLLER ----------
create table if not exists public.profiller (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  rol         text not null default 'uye',   -- 'uye' | 'admin'
  olusturuldu timestamptz not null default now()
);
alter table public.profiller enable row level security;

-- Admin kontrolü (RLS recursion'ını önlemek için SECURITY DEFINER)
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiller where id = auth.uid() and rol = 'admin')
$$;

-- Herkes kendi profilini, admin hepsini görür
drop policy if exists "profil gor" on public.profiller;
create policy "profil gor" on public.profiller
  for select using (auth.uid() = id or public.is_admin());

-- Yeni kullanıcı kaydolunca profil oluştur
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiller (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Mevcut kullanıcıları profiller'e aktar (geçmiş kayıtlar için)
insert into public.profiller (id, email)
  select id, email from auth.users on conflict (id) do nothing;

-- ---------- ADMIN OKUMA POLİTİKALARI (tüm veriyi görsün) ----------
drop policy if exists "favori admin" on public.favoriler;
create policy "favori admin" on public.favoriler for select using (public.is_admin());

drop policy if exists "alarm admin" on public.fiyat_alarmlari;
create policy "alarm admin" on public.fiyat_alarmlari for select using (public.is_admin());

drop policy if exists "sepet admin" on public.sepet;
create policy "sepet admin" on public.sepet for select using (public.is_admin());

drop policy if exists "akilli admin" on public.akilli_liste;
create policy "akilli admin" on public.akilli_liste for select using (public.is_admin());

-- ============================================================
-- SENİ ADMIN YAP:  önce uygulamadan bu e-posta ile KAYIT OL,
-- sonra bu satırı çalıştır (e-postayı kendi hesabınla değiştir):
-- ============================================================
update public.profiller set rol = 'admin' where email = 'aflazercan@gmail.com';

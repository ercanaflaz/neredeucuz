-- ============================================================
-- neredeucuz — HERKESE AÇIK İSTATİSTİK (Reklam Ver sayfası için)
-- izleme-kurulum.sql'den SONRA çalıştır (olaylar tablosu gerekir).
-- SECURITY DEFINER: yalnızca TOPLAM sayılar döner, kişisel veri DÖNMEZ.
-- ============================================================

create or replace function public.acik_istatistik()
returns json
language sql
security definer
stable
as $$
  select json_build_object(
    'ziyaretci30',    (select count(distinct ziyaretci_id) from public.olaylar
                         where created_at > now() - interval '30 days'),
    'goruntuleme30',  (select count(*) from public.olaylar
                         where created_at > now() - interval '30 days'
                         and tur in ('sayfa','urun')),
    'sehirSayisi',    (select count(distinct sehir) from public.olaylar
                         where sehir is not null and created_at > now() - interval '30 days'),
    'toplamZiyaretci',(select count(distinct ziyaretci_id) from public.olaylar),
    'aramaSayisi',    (select count(*) from public.olaylar
                         where tur = 'arama' and created_at > now() - interval '30 days'),
    'topSehirler',    (select coalesce(json_agg(t), '[]'::json) from (
                         select sehir as ad, count(distinct ziyaretci_id) as sayi
                         from public.olaylar
                         where sehir is not null and created_at > now() - interval '30 days'
                         group by sehir order by count(distinct ziyaretci_id) desc limit 6) t)
  );
$$;

-- Misafir (anon) ve üye herkes çağırabilsin — ama yalnızca toplam sayıları alır.
grant execute on function public.acik_istatistik() to anon, authenticated;

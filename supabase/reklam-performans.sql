-- ============================================================
-- neredeucuz — REKLAM PERFORMANS İSTATİSTİĞİ (admin)
-- Her reklamın son 30 gündeki gösterim ve tıklama sayısı.
-- İzleme (olaylar) tablosu 'reklam_gosterim' / 'reklam_tik' olaylarını tutar.
-- izleme-kurulum.sql'den SONRA çalıştır.
-- ============================================================

create or replace function public.reklam_istatistik()
returns json
language plpgsql
security definer
stable
as $$
declare sonuc json;
begin
  -- Sadece admin performans verisini görebilir
  if not exists (select 1 from public.profiller where id = auth.uid() and rol = 'admin') then
    return '{}'::json;
  end if;

  select coalesce(json_object_agg(id, sayilar), '{}'::json) into sonuc
  from (
    select (detay->>'id') as id,
      json_build_object(
        'gosterim', count(*) filter (where tur = 'reklam_gosterim'),
        'tiklama',  count(*) filter (where tur = 'reklam_tik')
      ) as sayilar
    from public.olaylar
    where tur in ('reklam_gosterim', 'reklam_tik')
      and detay->>'id' is not null
      and created_at > now() - interval '30 days'
    group by (detay->>'id')
  ) t;

  return sonuc;
end;
$$;

grant execute on function public.reklam_istatistik() to authenticated;

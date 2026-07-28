-- Management : distinguer les artistes managés du reste du CRM.
-- À exécuter une fois dans le SQL Editor de Supabase.

alter table public.artists
  add column if not exists is_managed boolean not null default false;

-- Le seul artiste managé pour l'instant : Herzo
update public.artists set is_managed = true where name ilike '%herzo%';

-- Vérification
select name, is_managed from public.artists order by is_managed desc, name;

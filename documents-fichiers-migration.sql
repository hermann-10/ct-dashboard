-- ═══════════════════════════════════════════════════════════
-- Page Documents — onglet Fichiers (riders, fiches techniques…)
-- Crée la table artist_documents + le bucket Storage « documents ».
-- À exécuter dans Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════

-- 1. Table des métadonnées de fichiers
create table if not exists public.artist_documents (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete set null,
  label text not null,
  file_path text not null unique,
  file_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

alter table public.artist_documents enable row level security;

drop policy if exists "Authenticated full access on artist_documents" on public.artist_documents;
create policy "Authenticated full access on artist_documents"
  on public.artist_documents
  for all
  to authenticated
  using (true)
  with check (true);

-- 2. Bucket de stockage privé « documents »
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- 3. Accès au bucket pour les utilisateurs authentifiés
drop policy if exists "Authenticated manage documents bucket" on storage.objects;
create policy "Authenticated manage documents bucket"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');

-- Vérification
select 'artist_documents OK' as table_status,
       (select count(*) from storage.buckets where id = 'documents') as bucket_exists;

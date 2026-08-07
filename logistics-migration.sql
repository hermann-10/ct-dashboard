-- ═══════════════════════════════════════════════════════════
-- Logistique / Inventaire matériel (façon feuille N'JOY)
-- Items globaux, sortables sur un événement (event_id + date).
-- À exécuter dans Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.logistics_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Divers',
  quantity integer not null default 1,
  status text not null default 'available'
    check (status in ('available', 'in_use', 'ordered', 'unavailable', 'out_of_stock')),
  condition text check (condition in ('excellent', 'bon', 'a_reparer')),
  location text,
  event_id uuid references public.events(id) on delete set null,
  out_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists logistics_items_event_idx on public.logistics_items (event_id);

alter table public.logistics_items enable row level security;

drop policy if exists "Authenticated full access on logistics_items" on public.logistics_items;
create policy "Authenticated full access on logistics_items"
  on public.logistics_items
  for all
  to authenticated
  using (true)
  with check (true);

select 'logistics_items OK' as status;

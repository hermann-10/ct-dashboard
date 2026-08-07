-- ═══════════════════════════════════════════════════════════
-- Gestion du staff par événement (serveuses, caisse, DJs, sécu…)
-- Inspiré du classeur N'JOY (feuille Staff + Finance Hub).
-- À exécuter dans Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null default '',
  role text not null,
  phone text,
  pay_type text not null default 'hourly' check (pay_type in ('hourly', 'flat')),
  rate numeric(10,2) not null default 25,
  start_time text,
  end_time text,
  status text not null default 'planned' check (status in ('planned', 'confirmed', 'paid')),
  checked_in boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_staff_event_idx on public.event_staff (event_id);

alter table public.event_staff enable row level security;

drop policy if exists "Authenticated full access on event_staff" on public.event_staff;
create policy "Authenticated full access on event_staff"
  on public.event_staff
  for all
  to authenticated
  using (true)
  with check (true);

select 'event_staff OK' as status;

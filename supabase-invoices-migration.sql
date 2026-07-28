-- ═══════════════════════════════════════════════════════════
-- Module de facturation — table event_invoices
-- À exécuter dans le SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════

create table if not exists public.event_invoices (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  invoice_number integer not null unique,
  client_name text not null,
  client_address text,
  client_phone text,
  issue_date date not null default current_date,
  due_date date,
  conditions text not null default 'Règlement par virement bancaire',
  items jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_invoices_event_id_idx on public.event_invoices (event_id);

alter table public.event_invoices enable row level security;

-- Accès complet pour les utilisateurs authentifiés (admin app)
create policy "Authenticated full access on event_invoices"
  on public.event_invoices
  for all
  to authenticated
  using (true)
  with check (true);

-- ═══════════════════════════════════════════════════════════════
-- MANAGEMENT V2 — factures & contrats des artistes managés
-- À exécuter une fois dans le SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════

-- Factures émises pour l'artiste (même structure que event_invoices)
create table if not exists public.artist_invoices (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
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

create index if not exists artist_invoices_artist_idx on public.artist_invoices (artist_id, invoice_number desc);

alter table public.artist_invoices enable row level security;

do $$ begin
  create policy "Authenticated full access on artist_invoices"
    on public.artist_invoices for all to authenticated
    using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Contrats de prestation
create table if not exists public.artist_contracts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  client_name text not null,
  client_address text,
  event_date date not null,
  venue text,
  city text,
  schedule text,
  fee numeric(10,2) not null default 0,
  payment_terms text not null default 'Paiement intégral le soir de la prestation',
  clauses text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'signed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artist_contracts_artist_idx on public.artist_contracts (artist_id, event_date desc);

alter table public.artist_contracts enable row level security;

do $$ begin
  create policy "Authenticated full access on artist_contracts"
    on public.artist_contracts for all to authenticated
    using (true) with check (true);
exception when duplicate_object then null; end $$;

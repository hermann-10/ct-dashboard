-- ============================================
-- HM-Events: Event Management Tables
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Charges / Dépenses
CREATE TABLE IF NOT EXISTS event_charges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'divers',
  label text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Recettes / Revenus
CREATE TABLE IF NOT EXISTS event_revenues (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'divers',
  label text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  is_received boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Lineup / Artistes
CREATE TABLE IF NOT EXISTS event_lineup (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  artist_name text NOT NULL,
  role text NOT NULL DEFAULT 'dj',
  fee numeric(10,2) DEFAULT 0,
  set_time text,
  is_confirmed boolean NOT NULL DEFAULT false,
  contact_info text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Add notes/strategy columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS strategy text;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_event_charges_event_id ON event_charges(event_id);
CREATE INDEX IF NOT EXISTS idx_event_revenues_event_id ON event_revenues(event_id);
CREATE INDEX IF NOT EXISTS idx_event_lineup_event_id ON event_lineup(event_id);

-- 6. RLS policies (permissive — same as events table)
ALTER TABLE event_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_lineup ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_charges' AND policyname = 'Allow all access') THEN
    CREATE POLICY "Allow all access" ON event_charges FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_revenues' AND policyname = 'Allow all access') THEN
    CREATE POLICY "Allow all access" ON event_revenues FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_lineup' AND policyname = 'Allow all access') THEN
    CREATE POLICY "Allow all access" ON event_lineup FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

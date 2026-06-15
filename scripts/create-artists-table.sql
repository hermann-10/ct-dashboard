-- ============================================
-- CRM Artistes — Table + liaison avec event_lineup
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Table artistes
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  genre TEXT DEFAULT '',
  role TEXT DEFAULT 'dj' CHECK (role IN ('dj', 'live', 'host', 'mc', 'other')),
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  website TEXT DEFAULT '',
  city TEXT DEFAULT '',
  photo_url TEXT DEFAULT NULL,
  notes TEXT DEFAULT '',
  rating INT DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ajouter colonne artist_id dans event_lineup (FK optionnelle)
ALTER TABLE event_lineup
  ADD COLUMN IF NOT EXISTS artist_id UUID REFERENCES artists(id) ON DELETE SET NULL;

-- 3. Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists (name);
CREATE INDEX IF NOT EXISTS idx_artists_genre ON artists (genre);
CREATE INDEX IF NOT EXISTS idx_event_lineup_artist_id ON event_lineup (artist_id);

-- 4. RLS (Row Level Security)
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

-- Politique: lecture pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can read artists"
  ON artists FOR SELECT
  TO authenticated
  USING (true);

-- Politique: écriture pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can insert artists"
  ON artists FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update artists"
  ON artists FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete artists"
  ON artists FOR DELETE
  TO authenticated
  USING (true);

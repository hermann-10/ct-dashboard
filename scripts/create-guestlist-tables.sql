-- ============================================
-- Guestlists par artiste pour les événements
-- ============================================

-- 1. Table des guestlists (une par artiste/responsable par événement)
CREATE TABLE IF NOT EXISTS event_guestlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  lineup_id UUID REFERENCES event_lineup(id) ON DELETE SET NULL,
  artist_name TEXT NOT NULL,
  quota INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table des invités (entrées dans une guestlist)
CREATE TABLE IF NOT EXISTS guestlist_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guestlist_id UUID NOT NULL REFERENCES event_guestlists(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  accompagnants INTEGER DEFAULT 0,
  remarks TEXT,
  is_checked_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Index pour performances
CREATE INDEX IF NOT EXISTS idx_event_guestlists_event_id ON event_guestlists(event_id);
CREATE INDEX IF NOT EXISTS idx_guestlist_entries_guestlist_id ON guestlist_entries(guestlist_id);

-- 4. RLS (Row Level Security)
ALTER TABLE event_guestlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE guestlist_entries ENABLE ROW LEVEL SECURITY;

-- Policies : accès complet pour les utilisateurs authentifiés
CREATE POLICY "Allow all for authenticated users" ON event_guestlists
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON guestlist_entries
  FOR ALL USING (auth.role() = 'authenticated');

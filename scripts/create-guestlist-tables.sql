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
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
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
CREATE INDEX IF NOT EXISTS idx_event_guestlists_share_token ON event_guestlists(share_token);

-- 4. RLS (Row Level Security)
ALTER TABLE event_guestlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE guestlist_entries ENABLE ROW LEVEL SECURITY;

-- Policies : accès complet pour les utilisateurs authentifiés (admin)
CREATE POLICY "Allow all for authenticated users" ON event_guestlists
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON guestlist_entries
  FOR ALL USING (auth.role() = 'authenticated');

-- Policies : accès anonyme en lecture pour les guestlists partagées (via share_token)
CREATE POLICY "Allow anon read shared guestlists" ON event_guestlists
  FOR SELECT TO anon
  USING (share_token IS NOT NULL);

-- Policies : accès anonyme pour les entrées des guestlists partagées
CREATE POLICY "Allow anon read shared entries" ON guestlist_entries
  FOR SELECT TO anon
  USING (guestlist_id IN (SELECT id FROM event_guestlists WHERE share_token IS NOT NULL));

CREATE POLICY "Allow anon insert shared entries" ON guestlist_entries
  FOR INSERT TO anon
  WITH CHECK (guestlist_id IN (SELECT id FROM event_guestlists WHERE share_token IS NOT NULL));

CREATE POLICY "Allow anon delete shared entries" ON guestlist_entries
  FOR DELETE TO anon
  USING (guestlist_id IN (SELECT id FROM event_guestlists WHERE share_token IS NOT NULL));

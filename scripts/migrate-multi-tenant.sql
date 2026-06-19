-- =====================================================
-- Migration: Multi-tenant — isoler les données par utilisateur
-- Run in Supabase SQL Editor (projet ogeokiczbzpdwcdthpnp)
-- =====================================================
-- Pré-requis: exécuter d'abord create-profiles-table.sql

-- ════════════════════════════════════════════════
-- 1. Ajouter user_id aux tables racines
-- ════════════════════════════════════════════════

ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE artists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE newsletter_contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE notification_rules ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- ════════════════════════════════════════════════
-- 2. Backfill: assigner les données existantes au 1er admin
-- ════════════════════════════════════════════════

DO $$
DECLARE
  admin_uid UUID;
BEGIN
  -- Récupérer le 1er user (toi, l'admin actuel)
  SELECT id INTO admin_uid FROM auth.users ORDER BY created_at ASC LIMIT 1;

  IF admin_uid IS NOT NULL THEN
    UPDATE events SET user_id = admin_uid WHERE user_id IS NULL;
    UPDATE artists SET user_id = admin_uid WHERE user_id IS NULL;
    UPDATE products SET user_id = admin_uid WHERE user_id IS NULL;
    UPDATE clicks SET user_id = admin_uid WHERE user_id IS NULL;
    UPDATE newsletter_contacts SET user_id = admin_uid WHERE user_id IS NULL;
    UPDATE newsletters SET user_id = admin_uid WHERE user_id IS NULL;
    UPDATE notification_rules SET user_id = admin_uid WHERE user_id IS NULL;
    UPDATE notifications SET user_id = admin_uid WHERE user_id IS NULL;
    UPDATE settings SET user_id = admin_uid WHERE user_id IS NULL;

    RAISE NOTICE 'Backfill done — all existing data assigned to user %', admin_uid;
  ELSE
    RAISE NOTICE 'No users found — skipping backfill';
  END IF;
END $$;

-- ════════════════════════════════════════════════
-- 2b. Trigger: auto-set user_id sur INSERT (authentifié)
-- ════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'events', 'artists', 'products', 'clicks',
    'newsletter_contacts', 'newsletters',
    'notification_rules', 'notifications', 'settings'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_user_id_trigger ON %I', tbl);
    EXECUTE format(
      'CREATE TRIGGER set_user_id_trigger BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION public.set_user_id()',
      tbl
    );
  END LOOP;
END $$;

-- ════════════════════════════════════════════════
-- 3. Index sur user_id pour performances
-- ════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_artists_user_id ON artists(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_clicks_user_id ON clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_contacts_user_id ON newsletter_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_user_id ON newsletters(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_rules_user_id ON notification_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- ════════════════════════════════════════════════
-- 4. RLS — tables racines : chaque user voit ses données
-- ════════════════════════════════════════════════

-- ── Events ──
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own events" ON events;
CREATE POLICY "Users see own events" ON events
  FOR ALL USING (auth.uid() = user_id);

-- Accès anon en lecture (pages publiques : home, guestlist, door)
DROP POLICY IF EXISTS "Anon can read public events" ON events;
CREATE POLICY "Anon can read public events" ON events
  FOR SELECT TO anon USING (true);

-- ── Artists ──
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own artists" ON artists;
CREATE POLICY "Users see own artists" ON artists
  FOR ALL USING (auth.uid() = user_id);

-- ── Products ──
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own products" ON products;
CREATE POLICY "Users see own products" ON products
  FOR ALL USING (auth.uid() = user_id);

-- ── Clicks ──
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own clicks" ON clicks;
CREATE POLICY "Users see own clicks" ON clicks
  FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Anon can insert clicks" ON clicks;
CREATE POLICY "Anon can insert clicks" ON clicks
  FOR INSERT TO anon WITH CHECK (true);

-- ── Newsletter contacts ──
ALTER TABLE newsletter_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own contacts" ON newsletter_contacts;
CREATE POLICY "Users see own contacts" ON newsletter_contacts
  FOR ALL USING (auth.uid() = user_id);

-- ── Newsletters ──
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own newsletters" ON newsletters;
CREATE POLICY "Users see own newsletters" ON newsletters
  FOR ALL USING (auth.uid() = user_id);

-- ── Notification rules ──
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own rules" ON notification_rules;
CREATE POLICY "Users see own rules" ON notification_rules
  FOR ALL USING (auth.uid() = user_id);

-- ── Notifications ──
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- ── Settings ──
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own settings" ON settings;
CREATE POLICY "Users see own settings" ON settings
  FOR ALL USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════
-- 5. RLS — tables enfants : héritage via event_id
-- ════════════════════════════════════════════════

-- Event charges
ALTER TABLE event_charges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own event charges" ON event_charges;
CREATE POLICY "Users manage own event charges" ON event_charges
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );

-- Event revenues
ALTER TABLE event_revenues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own event revenues" ON event_revenues;
CREATE POLICY "Users manage own event revenues" ON event_revenues
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );

-- Event lineup
ALTER TABLE event_lineup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own event lineup" ON event_lineup;
CREATE POLICY "Users manage own event lineup" ON event_lineup
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );

-- Event sales
ALTER TABLE event_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own event sales" ON event_sales;
CREATE POLICY "Users manage own event sales" ON event_sales
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );

-- Event guestlists
ALTER TABLE event_guestlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own guestlists" ON event_guestlists;
CREATE POLICY "Users manage own guestlists" ON event_guestlists
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );
-- Garder l'accès anon pour les pages publiques de guestlist
DROP POLICY IF EXISTS "Allow anon read shared guestlists" ON event_guestlists;
CREATE POLICY "Anon read shared guestlists" ON event_guestlists
  FOR SELECT TO anon USING (share_token IS NOT NULL);

-- Guestlist entries
ALTER TABLE guestlist_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own entries" ON guestlist_entries;
CREATE POLICY "Users manage own entries" ON guestlist_entries
  FOR ALL USING (
    guestlist_id IN (
      SELECT eg.id FROM event_guestlists eg
      JOIN events e ON eg.event_id = e.id
      WHERE e.user_id = auth.uid()
    )
  );
-- Garder l'accès anon pour les pages publiques
DROP POLICY IF EXISTS "Allow anon read shared entries" ON guestlist_entries;
DROP POLICY IF EXISTS "Allow anon insert shared entries" ON guestlist_entries;
DROP POLICY IF EXISTS "Allow anon delete shared entries" ON guestlist_entries;
CREATE POLICY "Anon read shared entries" ON guestlist_entries
  FOR SELECT TO anon
  USING (guestlist_id IN (SELECT id FROM event_guestlists WHERE share_token IS NOT NULL));
CREATE POLICY "Anon insert shared entries" ON guestlist_entries
  FOR INSERT TO anon
  WITH CHECK (guestlist_id IN (SELECT id FROM event_guestlists WHERE share_token IS NOT NULL));
CREATE POLICY "Anon delete shared entries" ON guestlist_entries
  FOR DELETE TO anon
  USING (guestlist_id IN (SELECT id FROM event_guestlists WHERE share_token IS NOT NULL));

-- ════════════════════════════════════════════════
-- 6. Reload PostgREST schema cache
-- ════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';

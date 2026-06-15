-- ============================================
-- Newsletter / Email Marketing — Tables
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Contacts
CREATE TABLE IF NOT EXISTS newsletter_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  source TEXT DEFAULT 'manual',
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Newsletters
CREATE TABLE IF NOT EXISTS newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  preview_text TEXT DEFAULT '',
  html_content TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent')),
  target_tags TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMPTZ DEFAULT NULL,
  sent_at TIMESTAMPTZ DEFAULT NULL,
  total_recipients INT DEFAULT 0,
  total_sent INT DEFAULT 0,
  total_opened INT DEFAULT 0,
  total_clicked INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Envois individuels (tracking)
CREATE TABLE IF NOT EXISTS newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES newsletter_contacts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT NULL,
  opened_at TIMESTAMPTZ DEFAULT NULL,
  clicked_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE(newsletter_id, contact_id)
);

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_contacts_email ON newsletter_contacts (email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON newsletter_contacts (status);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON newsletter_contacts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters (status);
CREATE INDEX IF NOT EXISTS idx_sends_newsletter ON newsletter_sends (newsletter_id);
CREATE INDEX IF NOT EXISTS idx_sends_contact ON newsletter_sends (contact_id);

-- 5. RLS
ALTER TABLE newsletter_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read contacts" ON newsletter_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert contacts" ON newsletter_contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update contacts" ON newsletter_contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete contacts" ON newsletter_contacts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth read newsletters" ON newsletters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert newsletters" ON newsletters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update newsletters" ON newsletters FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete newsletters" ON newsletters FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth read sends" ON newsletter_sends FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert sends" ON newsletter_sends FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update sends" ON newsletter_sends FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete sends" ON newsletter_sends FOR DELETE TO authenticated USING (true);

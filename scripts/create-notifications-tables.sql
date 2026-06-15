-- ============================================
-- Notifications system — run in Supabase SQL Editor
-- ============================================

-- 1. Notification rules (thresholds, reminders)
CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('click_threshold', 'event_reminder')),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  threshold_value INT,           -- for click_threshold: number of clicks
  reminder_days INT DEFAULT 3,   -- for event_reminder: days before event
  is_active BOOLEAN DEFAULT true,
  email_to TEXT,                  -- email address to notify
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Notification log (sent notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES notification_rules(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('click_threshold', 'event_reminder', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_via TEXT DEFAULT 'in_app',  -- 'in_app', 'email', 'both'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_event ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_rules_event ON notification_rules(event_id);
CREATE INDEX IF NOT EXISTS idx_notification_rules_active ON notification_rules(is_active);

-- RLS
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON notification_rules
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON notifications
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow anon (for cron API route to insert notifications)
CREATE POLICY "Allow insert for anon" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select for anon on rules" ON notification_rules
  FOR SELECT USING (true);

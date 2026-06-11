-- Settings table for site configuration (Facebook Pixel, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public can read settings (needed for pixel injection on home page)
CREATE POLICY "Public can read settings" ON settings
  FOR SELECT USING (true);

-- Authenticated users can manage settings
CREATE POLICY "Authenticated users manage settings" ON settings
  FOR ALL USING (auth.role() = 'authenticated');

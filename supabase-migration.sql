-- Events table for CT Tracker
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  ticket_url TEXT,
  image_emoji TEXT DEFAULT '🎉',
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public can read published events (for home page)
CREATE POLICY "Public can read published events" ON events
  FOR SELECT USING (is_published = true);

-- Authenticated users can do everything (admin)
CREATE POLICY "Authenticated users full access" ON events
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert existing events
INSERT INTO events (slug, name, date, venue, city, ticket_url, image_emoji) VALUES
  ('summer-vibes', 'Summer Vibes Afro', '2026-06-05', 'Halle W (Weetamix)', 'Genève', 'https://eventfrog.ch/fr/p/soirees-fetes/soiree-a-theme/summer-vibes-afro-halle-w-7465431493805902516.html', '🔥'),
  ('basel-060626', 'Comportement Tropical', '2026-06-06', 'Club Cello', 'Basel', 'https://eventfrog.ch/fr/p/soirees-fetes/soiree-a-theme/comportement-tropical-club-cello-basel-7463963782672313961.html', '🌴'),
  ('fete-musique-190626', 'Fête de la musique @LeCercle - After Comportement Tropical', '2026-06-19', 'Le Cercle', 'Genève', 'https://eventfrog.ch/de/p/partys/mottoparty/fete-de-la-musique-lecercle-after-comportement-tropical-7465451830606100656.html', '🎵')
ON CONFLICT (slug) DO NOTHING;

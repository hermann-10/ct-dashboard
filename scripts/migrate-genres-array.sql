-- ============================================
-- Migration: genre TEXT → genres TEXT[]
-- Converts single text field to array for
-- proper multi-genre filtering
-- ============================================

-- 1. Add new genres column
ALTER TABLE artists ADD COLUMN genres TEXT[] DEFAULT '{}';

-- 2. Migrate existing data (split comma-separated values)
UPDATE artists
SET genres = ARRAY(
  SELECT TRIM(unnest)
  FROM unnest(string_to_array(genre, ','))
  WHERE TRIM(unnest) != ''
)
WHERE genre IS NOT NULL AND genre != '';

-- 3. Drop old column and index
DROP INDEX IF EXISTS idx_artists_genre;
ALTER TABLE artists DROP COLUMN genre;

-- 4. Create GIN index for array operations (contains, overlap)
CREATE INDEX idx_artists_genres ON artists USING GIN (genres);

-- 5. Verify migration
SELECT name, genres FROM artists ORDER BY name;

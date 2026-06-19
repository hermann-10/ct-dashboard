-- Add checked_in_at timestamp to guestlist_entries
ALTER TABLE guestlist_entries
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Backfill: set checked_in_at = now() for already checked-in entries
UPDATE guestlist_entries
SET checked_in_at = now()
WHERE is_checked_in = true AND checked_in_at IS NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

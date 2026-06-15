-- Add check-in token column to guestlist_entries
ALTER TABLE guestlist_entries
ADD COLUMN IF NOT EXISTS checkin_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex');

-- Backfill existing entries without a token
UPDATE guestlist_entries
SET checkin_token = encode(gen_random_bytes(8), 'hex')
WHERE checkin_token IS NULL;

-- Fast lookup index
CREATE INDEX IF NOT EXISTS idx_guestlist_entries_checkin_token
ON guestlist_entries(checkin_token);

-- Allow anon users to read checkin_token (already covered by existing select policy)
-- No additional RLS policy needed since check-in is done by authenticated admin

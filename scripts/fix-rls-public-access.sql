-- =====================================================
-- Fix: Allow authenticated users to access public pages
-- (guestlist, door, checkin)
--
-- Problem: RLS public policies were scoped TO anon only.
-- Authenticated users could not view shared guestlists.
-- =====================================================

-- Ensure we're in the public schema
SET search_path TO public;

-- 1. Events: authenticated users can read all events (like anon already can)
DROP POLICY IF EXISTS "Authenticated can read public events" ON public.events;
CREATE POLICY "Authenticated can read public events" ON public.events
  FOR SELECT TO authenticated USING (true);

-- 2. Guestlists: authenticated users can read shared guestlists
DROP POLICY IF EXISTS "Authenticated read shared guestlists" ON public.event_guestlists;
CREATE POLICY "Authenticated read shared guestlists" ON public.event_guestlists
  FOR SELECT TO authenticated
  USING (share_token IS NOT NULL);

-- 3. Guestlist entries: authenticated users can read/insert/delete on shared guestlists
DROP POLICY IF EXISTS "Authenticated read shared entries" ON public.guestlist_entries;
CREATE POLICY "Authenticated read shared entries" ON public.guestlist_entries
  FOR SELECT TO authenticated
  USING (guestlist_id IN (SELECT id FROM public.event_guestlists WHERE share_token IS NOT NULL));

DROP POLICY IF EXISTS "Authenticated insert shared entries" ON public.guestlist_entries;
CREATE POLICY "Authenticated insert shared entries" ON public.guestlist_entries
  FOR INSERT TO authenticated
  WITH CHECK (guestlist_id IN (SELECT id FROM public.event_guestlists WHERE share_token IS NOT NULL));

DROP POLICY IF EXISTS "Authenticated delete shared entries" ON public.guestlist_entries;
CREATE POLICY "Authenticated delete shared entries" ON public.guestlist_entries
  FOR DELETE TO authenticated
  USING (guestlist_id IN (SELECT id FROM public.event_guestlists WHERE share_token IS NOT NULL));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

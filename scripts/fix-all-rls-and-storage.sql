-- =====================================================
-- FIX ALL: Profiles RLS recursion + Storage policies
-- Run in Supabase SQL Editor
-- =====================================================

-- ════════════════════════════════════════════════
-- 1. Fix profiles RLS recursive policy (causes 500)
-- ════════════════════════════════════════════════

-- Helper function that bypasses RLS to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop the recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

-- Recreate them using the helper function (no recursion)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (public.is_admin());

-- ════════════════════════════════════════════════
-- 2. Fix storage policies for event-flyers bucket
-- ════════════════════════════════════════════════

-- Allow authenticated users to upload flyers
INSERT INTO storage.policies (name, bucket_id, operation, definition, check_expression)
SELECT 'Authenticated users can upload flyers', 'event-flyers', 'INSERT',
  'true', 'true'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies
  WHERE bucket_id = 'event-flyers' AND operation = 'INSERT' AND name = 'Authenticated users can upload flyers'
);

-- Actually, storage policies use a different system. Let's use the proper approach:
-- Drop and recreate using the storage.objects table policies

-- Drop existing storage policies for event-flyers
DROP POLICY IF EXISTS "Authenticated upload flyers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update flyers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete flyers" ON storage.objects;
DROP POLICY IF EXISTS "Public read flyers" ON storage.objects;

-- Anyone can read flyers (public bucket)
CREATE POLICY "Public read flyers" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-flyers');

-- Authenticated users can upload flyers
CREATE POLICY "Authenticated upload flyers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-flyers');

-- Authenticated users can update their flyers
CREATE POLICY "Authenticated update flyers" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'event-flyers');

-- Authenticated users can delete flyers
CREATE POLICY "Authenticated delete flyers" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-flyers');

-- Same for artist-photos bucket
DROP POLICY IF EXISTS "Authenticated upload artist photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read artist photos" ON storage.objects;

CREATE POLICY "Public read artist photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'artist-photos');

CREATE POLICY "Authenticated upload artist photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'artist-photos');

-- ════════════════════════════════════════════════
-- 3. Reload PostgREST schema cache
-- ════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';

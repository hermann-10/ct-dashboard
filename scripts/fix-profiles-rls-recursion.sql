-- =====================================================
-- Fix: Profiles RLS recursive policy causing 500 errors
-- The "Admins can view all profiles" policy queries the
-- profiles table itself, creating infinite recursion.
-- Fix: use a SECURITY DEFINER function to bypass RLS.
-- Run in Supabase SQL Editor
-- =====================================================

-- 1. Create a helper function that bypasses RLS to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

-- 3. Recreate them using the helper function (no recursion)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (public.is_admin());

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

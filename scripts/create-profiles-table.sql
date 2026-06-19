-- =====================================================
-- Migration: Create profiles table for SaaS user mgmt
-- Run in Supabase SQL Editor
-- =====================================================

-- 1. Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT DEFAULT '',
  phone       TEXT DEFAULT '',
  avatar_url  TEXT DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  company     TEXT DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_sign_in_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);

-- 3. Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill existing auth users into profiles
INSERT INTO profiles (id, email, full_name)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- 5. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Admins can see all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Users can update their own profile (name, phone, avatar only)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

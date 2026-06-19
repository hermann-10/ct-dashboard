-- Migration: Add email column to guestlist_entries
-- Run this in Supabase SQL Editor

-- 1. Add email column
ALTER TABLE public.guestlist_entries ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

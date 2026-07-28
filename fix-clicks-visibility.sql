-- ════════════════════════════════════════════════════════════════
-- FIX : les clics enregistrés depuis le 19 juin 2026 sont invisibles
--
-- Cause : la migration multi-tenant du 19/06 a ajouté une colonne
-- user_id sur la table clicks + une policy RLS
-- « Users see own clicks » (auth.uid() = user_id).
-- Or les clics insérés par le tracker /go/:slug (Vercel) arrivent
-- sans session utilisateur → user_id = NULL → jamais visibles
-- dans l'app. Les clics existaient, ils étaient juste filtrés.
--
-- Ce script :
--   1. Rattache les clics orphelins au propriétaire de l'événement
--   2. Ajoute un trigger qui rattache automatiquement chaque futur
--      clic au propriétaire de l'événement (via le slug)
-- À exécuter UNE FOIS dans Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════

-- 1a. Backfill : rattacher chaque clic orphelin au propriétaire de son événement
UPDATE clicks c
SET user_id = e.user_id
FROM events e
WHERE c.user_id IS NULL
  AND e.slug = c.event_slug
  AND e.user_id IS NOT NULL;

-- 1b. Fallback : clics dont l'événement n'existe plus → 1er admin
UPDATE clicks
SET user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

-- 2. Trigger : les futurs clics héritent automatiquement du
--    propriétaire de l'événement (même si l'API n'envoie pas user_id)
CREATE OR REPLACE FUNCTION public.set_click_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.event_slug IS NOT NULL THEN
    SELECT user_id INTO NEW.user_id FROM events WHERE slug = NEW.event_slug LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_click_owner_trigger ON clicks;
CREATE TRIGGER set_click_owner_trigger
  BEFORE INSERT ON clicks
  FOR EACH ROW EXECUTE FUNCTION public.set_click_owner();

-- Vérification : il ne doit plus rester de clics orphelins
SELECT
  count(*) FILTER (WHERE user_id IS NULL) AS clics_orphelins,
  count(*) FILTER (WHERE created_at >= '2026-06-20') AS clics_depuis_20_juin,
  max(created_at) AS dernier_clic
FROM clicks;

#!/usr/bin/env node
/**
 * Supprime tous les clics avant le 9 juin 2026
 * Usage: node scripts/cleanup-old-clicks.mjs
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ogeokiczbzpdwcdthpnp.supabase.co',
  'sb_publishable_-eSVqLLI6WgDOEoagAt7Zw_R58yXm6q'
);

const CUTOFF = '2026-06-09T00:00:00';

async function main() {
  console.log(`\n🔍 Recherche des clics avant le ${CUTOFF}...\n`);

  // 1. List old clicks
  const { data: oldClicks, error: fetchErr } = await supabase
    .from('clicks')
    .select('id, event_slug, created_at')
    .lt('created_at', CUTOFF)
    .order('created_at', { ascending: true });

  if (fetchErr) {
    console.error('❌ Erreur:', fetchErr.message);
    process.exit(1);
  }

  if (!oldClicks || oldClicks.length === 0) {
    console.log('✅ Aucun clic avant le 9 juin 2026. Rien à supprimer.');
    return;
  }

  // Group by event
  const grouped = {};
  oldClicks.forEach(c => {
    const slug = c.event_slug || 'unknown';
    grouped[slug] = (grouped[slug] || 0) + 1;
  });

  console.log(`📊 ${oldClicks.length} clics trouvés:`);
  Object.entries(grouped).forEach(([slug, count]) => {
    console.log(`   - ${slug}: ${count} clics`);
  });
  console.log(`   Période: ${oldClicks[0].created_at} → ${oldClicks[oldClicks.length - 1].created_at}`);

  // 2. Delete
  console.log(`\n🗑️  Suppression en cours...`);
  const { error: delErr } = await supabase
    .from('clicks')
    .delete()
    .lt('created_at', CUTOFF);

  if (delErr) {
    console.error('❌ Erreur suppression:', delErr.message);
    process.exit(1);
  }

  console.log(`✅ ${oldClicks.length} clics supprimés !`);

  // 3. Verify
  const { count: remaining } = await supabase
    .from('clicks')
    .select('*', { count: 'exact', head: true });
  console.log(`📈 Clics restants dans la table: ${remaining}\n`);
}

main().catch(console.error);

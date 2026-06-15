import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ogeokiczbzpdwcdthpnp.supabase.co',
  'sb_publishable_-eSVqLLI6WgDOEoagAt7Zw_R58yXm6q'
);

// First, see what's before June 9
const { data: oldClicks, error: err1 } = await supabase
  .from('clicks')
  .select('id, event_slug, created_at')
  .lt('created_at', '2026-06-09T00:00:00')
  .order('created_at', { ascending: true });

if (err1) {
  console.error('Error fetching:', err1.message);
  process.exit(1);
}

console.log(`Found ${oldClicks.length} clicks before June 9, 2026:`);
const grouped = {};
oldClicks.forEach(c => {
  const slug = c.event_slug || 'unknown';
  grouped[slug] = (grouped[slug] || 0) + 1;
});
console.log('By event:', JSON.stringify(grouped, null, 2));
if (oldClicks.length > 0) {
  console.log('First:', oldClicks[0].created_at);
  console.log('Last:', oldClicks[oldClicks.length - 1].created_at);
}

// Delete them
if (oldClicks.length > 0) {
  const { error: delErr } = await supabase
    .from('clicks')
    .delete()
    .lt('created_at', '2026-06-09T00:00:00');

  if (delErr) {
    console.error('Delete error:', delErr.message);
  } else {
    console.log('Deleted successfully!');
  }
}

// Verify remaining
const { count: remaining } = await supabase
  .from('clicks')
  .select('*', { count: 'exact', head: true });
console.log('Remaining clicks in table:', remaining);

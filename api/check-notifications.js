import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ogeokiczbzpdwcdthpnp.supabase.co',
  'sb_publishable_-eSVqLLI6WgDOEoagAt7Zw_R58yXm6q'
);

/**
 * Cron job: check notification rules and create alerts.
 * Triggered daily by Vercel Cron or manually via GET /api/check-notifications
 *
 * Checks:
 * 1. Event reminders (J-3, J-1, etc.)
 * 2. Click thresholds reached
 *
 * Optionally sends email via Resend if RESEND_API_KEY is set.
 */
export default async function handler(req, res) {
  // Simple auth: check cron secret or allow GET for manual trigger
  const cronSecret = req.headers['authorization']?.replace('Bearer ', '');
  const envSecret = process.env.CRON_SECRET;
  if (envSecret && cronSecret !== envSecret && req.method !== 'GET') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = { reminders: 0, thresholds: 0, errors: [] };

  try {
    // ── 1. Event reminders ──
    const { data: reminderRules } = await supabase
      .from('notification_rules')
      .select('*, events!notification_rules_event_id_fkey(name, date, slug, venue, city)')
      .eq('type', 'event_reminder')
      .eq('is_active', true);

    if (reminderRules) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const rule of reminderRules) {
        const event = rule.events;
        if (!event) continue;

        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((eventDate - today) / (1000 * 60 * 60 * 24));
        const targetDays = rule.reminder_days ?? 3;

        if (daysUntil === targetDays) {
          // Check if already sent today
          const todayStr = today.toISOString().split('T')[0];
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('rule_id', rule.id)
            .gte('created_at', todayStr)
            .limit(1);

          if (!existing || existing.length === 0) {
            const title = `Rappel J-${targetDays} : ${event.name}`;
            const message = `L'événement "${event.name}" a lieu dans ${targetDays} jour${targetDays > 1 ? 's' : ''} (${event.date}) à ${event.venue}, ${event.city}. Pensez à vérifier les derniers préparatifs.`;

            await createNotification(rule.id, rule.event_id, 'event_reminder', title, message, rule.email_to);
            results.reminders++;
          }
        }
      }
    }

    // ── 2. Click thresholds ──
    const { data: thresholdRules } = await supabase
      .from('notification_rules')
      .select('*, events!notification_rules_event_id_fkey(name, slug)')
      .eq('type', 'click_threshold')
      .eq('is_active', true);

    if (thresholdRules) {
      for (const rule of thresholdRules) {
        const event = rule.events;
        if (!event || !rule.threshold_value) continue;

        // Get current click count
        const { count } = await supabase
          .from('clicks')
          .select('*', { count: 'exact', head: true })
          .eq('event_slug', event.slug);

        const clickCount = count ?? 0;

        if (clickCount >= rule.threshold_value) {
          // Check if already notified for this threshold
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('rule_id', rule.id)
            .limit(1);

          if (!existing || existing.length === 0) {
            const title = `Seuil atteint : ${clickCount} clics pour ${event.name}`;
            const message = `L'événement "${event.name}" a atteint ${clickCount} clics (seuil: ${rule.threshold_value}). Vos campagnes marketing fonctionnent.`;

            await createNotification(rule.id, rule.event_id, 'click_threshold', title, message, rule.email_to);
            results.thresholds++;

            // Deactivate the rule after triggering
            await supabase
              .from('notification_rules')
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq('id', rule.id);
          }
        }
      }
    }
  } catch (e) {
    results.errors.push(e.message);
  }

  return res.status(200).json({
    ok: true,
    checked_at: new Date().toISOString(),
    ...results,
  });
}

async function createNotification(ruleId, eventId, type, title, message, emailTo) {
  // Save in-app notification
  await supabase.from('notifications').insert({
    rule_id: ruleId,
    event_id: eventId,
    type,
    title,
    message,
    sent_via: emailTo ? 'both' : 'in_app',
  });

  // Send email if Resend API key is configured and emailTo is set
  if (emailTo && process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'HM-Events <notifications@hm-events.ch>',
          to: [emailTo],
          subject: title,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #e65100, #ff6d00); padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="color: white; margin: 0;">${title}</h2>
              </div>
              <div style="padding: 20px; background: #f9fafb; border-radius: 0 0 8px 8px;">
                <p style="font-size: 15px; line-height: 1.6; color: #333;">${message}</p>
                <a href="https://hm-events.ch/admin" style="display: inline-block; margin-top: 16px; padding: 10px 24px; background: #e65100; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Voir le dashboard</a>
              </div>
            </div>
          `,
        }),
      });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
    }
  }
}

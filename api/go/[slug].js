import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  'https://ogeokiczbzpdwcdthpnp.supabase.co',
  'sb_publishable_-eSVqLLI6WgDOEoagAt7Zw_R58yXm6q'
);

function hashIp(ip) {
  if (!ip) return 'unknown';
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

function detectDevice(ua) {
  if (!ua) return 'unknown';
  ua = ua.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|opera m(ob|in)/.test(ua)) return 'mobile';
  return 'desktop';
}

export default async function handler(req, res) {
  const slug = req.query.slug;

  if (!slug) {
    return res.redirect(302, 'https://hm-events.ch');
  }

  try {
    // Look up event by slug
    const { data: event, error } = await supabase
      .from('events')
      .select('name, ticket_url, image_url')
      .eq('slug', slug)
      .single();

    if (error || !event || !event.ticket_url) {
      return res.status(404).send(notFoundPage());
    }

    // Get Facebook Pixel ID from settings
    let pixelId = null;
    try {
      const { data: setting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'fb_pixel_id')
        .single();
      if (setting) pixelId = setting.value;
    } catch {}

    // Get UTM params
    const utmSource = req.query.utm_source || '';
    const utmMedium = req.query.utm_medium || '';
    const utmCampaign = req.query.utm_campaign || '';
    const utmContent = req.query.utm_content || '';
    const fbclid = req.query.fbclid || '';
    const fbAdId = req.query.fb_ad_id || '';
    const fbAdsetId = req.query.fb_adset_id || '';
    const fbCampaignId = req.query.fb_campaign_id || '';

    // Record click in database
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.socket?.remoteAddress
      || '';
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || req.headers['referrer'] || '';

    try {
      await supabase.from('clicks').insert({
        event_slug: slug,
        event_name: event.name,
        ip_hash: hashIp(ip),
        user_agent: userAgent,
        device: detectDevice(userAgent),
        referrer,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        utm_content: utmContent || null,
        fbclid: fbclid || null,
        fb_ad_id: fbAdId || null,
        fb_adset_id: fbAdsetId || null,
        fb_campaign_id: fbCampaignId || null,
      });
    } catch (clickErr) {
      console.error('Click recording failed:', clickErr);
    }

    // Return HTML page with pixel + delayed redirect
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(redirectPage({
      eventName: event.name,
      ticketUrl: event.ticket_url,
      imageUrl: event.image_url,
      pixelId,
      utmSource,
      utmMedium,
      utmCampaign,
      slug,
    }));
  } catch (e) {
    console.error('Redirect error:', e);
    return res.redirect(302, 'https://hm-events.ch');
  }
}

function redirectPage({ eventName, ticketUrl, imageUrl, pixelId, utmSource, utmMedium, utmCampaign, slug }) {
  const pixelScript = pixelId ? `
    <!-- Facebook Pixel -->
    <script>
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
      fbq('track', 'ViewContent', {
        content_name: '${eventName.replace(/'/g, "\\'")}',
        content_ids: ['${slug}'],
        content_type: 'event',
        utm_source: '${utmSource}',
        utm_campaign: '${utmCampaign}'
      });
    </script>
    <noscript>
      <img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />
    </noscript>
  ` : '';

  const ogImage = imageUrl ? `<meta property="og:image" content="${imageUrl}">` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${eventName} — HM-Events</title>
  <meta property="og:title" content="${eventName}">
  <meta property="og:description" content="Achète tes tickets sur HM-Events">
  <meta property="og:type" content="website">
  ${ogImage}
  <meta http-equiv="refresh" content="1;url=${ticketUrl}">
  ${pixelScript}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e65100, #ff6d00);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: white;
      text-align: center;
      padding: 2rem;
    }
    .container {
      max-width: 400px;
    }
    h1 {
      font-size: 1.4rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }
    .loader {
      width: 40px; height: 40px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    p {
      font-size: 0.95rem;
      opacity: 0.9;
    }
    a {
      color: white;
      text-decoration: underline;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="loader"></div>
    <h1>${eventName}</h1>
    <p>Redirection vers la billetterie...</p>
    <p style="margin-top: 1rem; font-size: 0.85rem;">
      Si la redirection ne fonctionne pas, <a href="${ticketUrl}">clique ici</a>.
    </p>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = '${ticketUrl}';
    }, 1000);
  </script>
</body>
</html>`;
}

function notFoundPage() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Événement non trouvé — HM-Events</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e65100, #ff6d00);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: white;
      text-align: center;
      padding: 2rem;
    }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    a { color: white; font-weight: 600; }
  </style>
</head>
<body>
  <div>
    <h1>Événement non trouvé</h1>
    <p>Visite <a href="https://hm-events.ch">hm-events.ch</a> pour les prochains événements.</p>
  </div>
</body>
</html>`;
}

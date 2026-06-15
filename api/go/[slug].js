import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ogeokiczbzpdwcdthpnp.supabase.co',
  'sb_publishable_-eSVqLLI6WgDOEoagAt7Zw_R58yXm6q'
);

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

    // Get UTM params for pixel tracking
    const utmSource = req.query.utm_source || '';
    const utmMedium = req.query.utm_medium || '';
    const utmCampaign = req.query.utm_campaign || '';

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

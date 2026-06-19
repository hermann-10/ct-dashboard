// Supabase Edge Function: Send QR code email to guestlist guests
// Deploy: supabase functions deploy send-guestlist-qr --no-verify-jwt --project-ref ogeokiczbzpdwcdthpnp
// Secret: supabase secrets set RESEND_API_KEY=re_xxxx --project-ref ogeokiczbzpdwcdthpnp

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface QrEmailPayload {
  guest_name: string;
  guest_email: string;
  checkin_token: string;
  event_name: string;
  event_date: string;
  event_venue: string;
  event_city: string;
  artist_name: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: QrEmailPayload = await req.json();
    const {
      guest_name, guest_email, checkin_token,
      event_name, event_date, event_venue, event_city, artist_name,
    } = payload;

    if (!guest_email || !checkin_token || !event_name || !guest_name) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      console.error('RESEND_API_KEY not set');
      return jsonResponse({ error: 'Email service not configured' }, 500);
    }

    const checkinUrl = `https://hm-events.ch/checkin/verify/${checkin_token}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkinUrl)}&bgcolor=ffffff&color=1e1e3c&margin=10`;
    const formattedDate = formatDate(event_date);
    const html = buildEmailHtml({
      guest_name, event_name, formattedDate,
      event_venue, event_city, artist_name, qrImageUrl, checkinUrl,
    });

    // Send via Resend API (simple HTTP call)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HM Events <info@hm-events.ch>',
        to: [guest_email],
        subject: `Votre invitation — ${event_name}`,
        html,
        text: `Bonjour ${guest_name},\n\nVoici votre invitation pour ${event_name} le ${formattedDate} à ${event_venue}${event_city ? ', ' + event_city : ''}.\nGuestlist : ${artist_name}\n\nPrésentez ce lien à l'entrée :\n${checkinUrl}\n\n— HM Events`,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', res.status, err);
      return jsonResponse({ error: `Email send failed: ${res.status}` }, 500);
    }

    const result = await res.json();
    console.log(`Email sent to ${guest_email} — id: ${result.id}`);
    return jsonResponse({ success: true, id: result.id });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('send-guestlist-qr error:', message);
    return jsonResponse({ error: message }, 500);
  }
});

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-CH', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function buildEmailHtml(data: {
  guest_name: string; event_name: string; formattedDate: string;
  event_venue: string; event_city: string; artist_name: string;
  qrImageUrl: string; checkinUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f3ff;font-family:'Roboto','Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ff;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(108,92,231,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1e1b4b,#302b63);padding:32px 32px 24px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Vous êtes invité(e) !</h1>
        </td></tr>
        <tr><td style="padding:28px 32px 0;">
          <p style="margin:0 0 4px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Événement</p>
          <h2 style="margin:0 0 16px;color:#1e1b4b;font-size:20px;font-weight:700;">${data.event_name}</h2>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 10px 4px 0;font-size:16px;">📅</td><td style="padding:4px 0;color:#374151;font-size:14px;">${data.formattedDate}</td></tr>
            <tr><td style="padding:4px 10px 4px 0;font-size:16px;">📍</td><td style="padding:4px 0;color:#374151;font-size:14px;">${data.event_venue}${data.event_city ? `, ${data.event_city}` : ''}</td></tr>
            <tr><td style="padding:4px 10px 4px 0;font-size:16px;">🎵</td><td style="padding:4px 0;color:#374151;font-size:14px;">Guestlist : ${data.artist_name}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" /></td></tr>
        <tr><td style="padding:0 32px;text-align:center;">
          <p style="margin:0 0 8px;color:#374151;font-size:15px;">Bonjour <strong>${data.guest_name}</strong>,</p>
          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.5;">Présentez ce QR code à l'entrée pour accéder à l'événement.</p>
          <div style="display:inline-block;padding:16px;background:#fff;border:2px solid #e5e7eb;border-radius:12px;">
            <img src="${data.qrImageUrl}" alt="QR Code" width="180" height="180" style="display:block;" />
          </div>
          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">Ne partagez pas ce code — il est unique et à votre nom.</p>
        </td></tr>
        <tr><td style="padding:24px 32px;text-align:center;">
          <a href="${data.checkinUrl}" target="_blank" style="display:inline-block;padding:12px 28px;background-color:#6C5CE7;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Ouvrir mon QR code</a>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #f3f4f6;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Envoyé par <strong>HM Events</strong> · Si vous n'attendiez pas cette invitation, ignorez ce message.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

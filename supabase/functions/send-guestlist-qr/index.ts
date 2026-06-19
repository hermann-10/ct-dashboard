// Supabase Edge Function: Send QR code email to guestlist guests
// Deploy: supabase functions deploy send-guestlist-qr
// Secrets needed:
//   supabase secrets set SMTP_HOST=xxx SMTP_PORT=465 SMTP_USER=xxx SMTP_PASS=xxx

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface QrEmailPayload {
  guest_name: string;
  guest_email: string;
  checkin_token: string;
  event_name: string;
  event_date: string;
  event_venue: string;
  event_city: string;
  artist_name: string;
  event_image_url?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: QrEmailPayload = await req.json();
    const {
      guest_name,
      guest_email,
      checkin_token,
      event_name,
      event_date,
      event_venue,
      event_city,
      artist_name,
      event_image_url,
    } = payload;

    // Validate required fields
    if (!guest_email || !checkin_token || !event_name || !guest_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: guest_email, checkin_token, event_name, guest_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate QR code as SVG using a lightweight approach (no npm dependency)
    const checkinUrl = `https://hm-events.ch/checkin/verify/${checkin_token}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkinUrl)}&bgcolor=ffffff&color=1e1e3c&margin=10`;

    // Format date
    const formattedDate = formatDate(event_date);

    // Build email HTML
    const html = buildEmailHtml({
      guest_name,
      event_name,
      formattedDate,
      event_venue,
      event_city,
      artist_name,
      qrImageUrl,
      checkinUrl,
      event_image_url,
    });

    // Send via SMTP
    const smtpHost = Deno.env.get('SMTP_HOST') ?? '';
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') ?? '465');
    const smtpUser = Deno.env.get('SMTP_USER') ?? '';
    const smtpPass = Deno.env.get('SMTP_PASS') ?? '';

    if (!smtpHost || !smtpUser || !smtpPass) {
      return new Response(
        JSON.stringify({ error: 'SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,       // implicit TLS for 465
        starttls: smtpPort === 587,   // STARTTLS for 587
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    await client.send({
      from: `HM Events <info@hm-events.ch>`,
      to: guest_email,
      subject: `Votre invitation — ${event_name}`,
      html,
      content: `Bonjour ${guest_name}, voici votre QR code pour ${event_name}. Présentez-le à l'entrée. Lien: ${checkinUrl}`,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: `Email sent to ${guest_email}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('send-guestlist-qr error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-CH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function buildEmailHtml(data: {
  guest_name: string;
  event_name: string;
  formattedDate: string;
  event_venue: string;
  event_city: string;
  artist_name: string;
  qrImageUrl: string;
  checkinUrl: string;
  event_image_url?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Votre invitation — ${data.event_name}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f3ff;font-family:'Roboto','Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ff;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(108,92,231,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e1b4b,#302b63);padding:32px 32px 24px;text-align:center;">
              <img src="https://hm-events.ch/hm_dev_logo_white.png" alt="HM Events" width="48" height="48" style="display:inline-block;margin-bottom:12px;" />
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                Vous êtes invité(e) !
              </h1>
            </td>
          </tr>

          <!-- Event info -->
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
                Événement
              </p>
              <h2 style="margin:0 0 16px;color:#1e1b4b;font-size:20px;font-weight:700;">
                ${data.event_name}
              </h2>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
                <tr>
                  <td style="padding:4px 10px 4px 0;vertical-align:top;color:#6C5CE7;font-size:16px;">📅</td>
                  <td style="padding:4px 0;color:#374151;font-size:14px;">${data.formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding:4px 10px 4px 0;vertical-align:top;color:#6C5CE7;font-size:16px;">📍</td>
                  <td style="padding:4px 0;color:#374151;font-size:14px;">${data.event_venue}${data.event_city ? `, ${data.event_city}` : ''}</td>
                </tr>
                <tr>
                  <td style="padding:4px 10px 4px 0;vertical-align:top;color:#6C5CE7;font-size:16px;">🎵</td>
                  <td style="padding:4px 0;color:#374151;font-size:14px;">Guestlist : ${data.artist_name}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:20px 32px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>

          <!-- Guest greeting + QR -->
          <tr>
            <td style="padding:0 32px;text-align:center;">
              <p style="margin:0 0 8px;color:#374151;font-size:15px;">
                Bonjour <strong>${data.guest_name}</strong>,
              </p>
              <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.5;">
                Présentez ce QR code à l'entrée pour accéder à l'événement.
              </p>

              <!-- QR Code -->
              <div style="display:inline-block;padding:16px;background:#ffffff;border:2px solid #e5e7eb;border-radius:12px;">
                <img src="${data.qrImageUrl}" alt="QR Code" width="180" height="180" style="display:block;" />
              </div>

              <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
                Ne partagez pas ce code — il est unique et à votre nom.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:24px 32px;text-align:center;">
              <a href="${data.checkinUrl}" target="_blank" style="display:inline-block;padding:12px 28px;background-color:#6C5CE7;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.2px;">
                Ouvrir mon QR code
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                Cet email a été envoyé par <strong>HM Events</strong>.<br />
                Si vous n'attendiez pas cette invitation, ignorez ce message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

import type { PlayerRegistration } from '../types';

const BREVO_KEY_STORAGE = 'fcb_brevo_api_key_v1';
const BREVO_SENDER_EMAIL_STORAGE = 'fcb_brevo_sender_email_v1';
const BREVO_SENDER_NAME_STORAGE = 'fcb_brevo_sender_name_v1';

export interface BrevoConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
}

// Get Brevo API settings (environment variables prioritized over localStorage fallback)
export const getBrevoConfig = (): BrevoConfig => {
  const envKey = import.meta.env.VITE_BREVO_API_KEY || '';
  const envEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL || '';
  const envName = import.meta.env.VITE_BREVO_SENDER_NAME || '';

  const localKey = localStorage.getItem(BREVO_KEY_STORAGE) || '';
  const localEmail = localStorage.getItem(BREVO_SENDER_EMAIL_STORAGE) || '';
  const localName = localStorage.getItem(BREVO_SENDER_NAME_STORAGE) || '';

  return {
    apiKey: envKey || localKey,
    senderEmail: envEmail || localEmail || 'fcbclub@gmail.com',
    senderName: envName || localName || 'FCB Football Club'
  };
};

export const saveBrevoConfigLocal = (apiKey: string, senderEmail: string, senderName: string) => {
  localStorage.setItem(BREVO_KEY_STORAGE, apiKey.trim());
  localStorage.setItem(BREVO_SENDER_EMAIL_STORAGE, senderEmail.trim());
  localStorage.setItem(BREVO_SENDER_NAME_STORAGE, senderName.trim());
};

export const isBrevoReady = (): boolean => {
  const cfg = getBrevoConfig();
  return Boolean(cfg.apiKey && cfg.apiKey.length > 10);
};

// Core Brevo Transactional Email Sender API
export const sendBrevoEmail = async (params: {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const config = getBrevoConfig();

  if (!config.apiKey) {
    console.warn("⚠️ Brevo API Key not configured. Skipping transactional email.");
    return {
      success: false,
      error: 'Brevo API key is not configured. Please add VITE_BREVO_API_KEY to your .env or Admin Settings.'
    };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': config.apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: config.senderName,
          email: config.senderEmail
        },
        to: [
          {
            email: params.toEmail,
            name: params.toName
          }
        ],
        subject: params.subject,
        htmlContent: params.htmlContent
      })
    });

    const data = await response.json();

    if (response.ok && data.messageId) {
      console.log(`✅ Brevo Email dispatched successfully to ${params.toEmail}. Message ID: ${data.messageId}`);
      return { success: true, messageId: data.messageId };
    } else {
      const errMsg = data.message || data.code || 'Brevo API request failed';
      console.error("❌ Brevo API Error:", data);
      return { success: false, error: errMsg };
    }
  } catch (err: any) {
    console.error("❌ Brevo Network Fetch Error:", err);
    return { success: false, error: err.message || 'Network error connecting to Brevo API' };
  }
};

// HTML EMAIL TEMPLATE BUILDERS
export const generateWelcomeMatchPassHTML = (player: PlayerRegistration): string => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(player.ticketId)}`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FCB Match Pass - ${player.ticketId}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #04060d; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #f8fafc;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #04060d; padding: 20px 0;">
      <tr>
        <td align="center">
          <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background: #0b0f19; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            
            <!-- HEADER BRANDING -->
            <tr>
              <td align="center" style="padding: 30px 20px; background: linear-gradient(135deg, #0b0f19 0%, #172033 100%); border-bottom: 2px solid #ffb800;">
                <h1 style="margin: 0; color: #ffb800; font-size: 26px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
                  ⚽ FCB FOOTBALL CLUB
                </h1>
                <p style="margin: 5px 0 0; color: #00e87a; font-size: 13px; font-weight: 700; letter-spacing: 1px;">
                  SUMMER TOURNAMENT 2026 · OFFICIAL MATCH PASS
                </p>
              </td>
            </tr>

            <!-- WELCOME MESSAGE -->
            <tr>
              <td style="padding: 30px 30px 10px 30px;">
                <h2 style="margin: 0 0 10px; color: #ffffff; font-size: 20px; font-weight: 800;">
                  Welcome aboard, ${player.name}! 👋
                </h2>
                <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                  Your registration for the <strong>FCB Summer Football Cup</strong> has been successfully received! Below is your official Digital Match Pass and gate QR entry details.
                </p>
              </td>
            </tr>

            <!-- TICKET CARD OVERVIEW -->
            <tr>
              <td style="padding: 20px 30px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #111827; border: 1px solid #1e293b; border-radius: 14px; padding: 20px;">
                  <tr>
                    <td align="center" style="padding-bottom: 15px; border-bottom: 1px dashed #334155;">
                      <span style="background: rgba(255, 184, 0, 0.15); color: #ffb800; border: 1px solid rgba(255, 184, 0, 0.3); font-family: monospace; font-size: 22px; font-weight: 900; padding: 6px 16px; border-radius: 8px; display: inline-block;">
                        TICKET ID: ${player.ticketId}
                      </span>
                    </td>
                  </tr>

                  <!-- QR CODE & DETAILS -->
                  <tr>
                    <td style="padding-top: 20px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <!-- QR Code Image -->
                          <td width="160" align="center" style="vertical-align: middle;">
                            <div style="background: #ffffff; padding: 8px; border-radius: 10px; display: inline-block;">
                              <img src="${qrUrl}" alt="Match Pass QR Code" width="140" height="140" style="display: block; border: 0;" />
                            </div>
                          </td>

                          <!-- Player Details -->
                          <td style="padding-left: 20px; vertical-align: middle;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 13px; color: #cbd5e1;">
                              <tr>
                                <td style="color: #64748b; font-weight: 700;">Player Name:</td>
                                <td style="color: #ffffff; font-weight: 800;">${player.name}</td>
                              </tr>
                              <tr>
                                <td style="color: #64748b; font-weight: 700;">Position:</td>
                                <td style="color: #00e87a; font-weight: 800;">${player.position}</td>
                              </tr>
                              <tr>
                                <td style="color: #64748b; font-weight: 700;">WhatsApp:</td>
                                <td style="color: #ffffff; font-family: monospace;">+91 ${player.phone}</td>
                              </tr>
                              <tr>
                                <td style="color: #64748b; font-weight: 700;">UTR Ref:</td>
                                <td style="color: #ffb800; font-family: monospace;">${player.utrNumber}</td>
                              </tr>
                              <tr>
                                <td style="color: #64748b; font-weight: 700;">Entry Fee:</td>
                                <td style="color: #00e87a; font-weight: 800;">₹250 Paid</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- EVENT SCHEDULE & LOCATION -->
            <tr>
              <td style="padding: 10px 30px 30px 30px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #0f172a; border-radius: 12px; padding: 15px; border: 1px solid #1e293b;">
                  <tr>
                    <td>
                      <h4 style="margin: 0 0 10px; color: #ffb800; font-size: 14px; text-transform: uppercase;">📍 Match Schedule & Venue</h4>
                      <p style="margin: 4px 0; color: #cbd5e1; font-size: 13px;">📅 <strong>Date:</strong> August 23, 2026</p>
                      <p style="margin: 4px 0; color: #cbd5e1; font-size: 13px;">⏰ <strong>Gate Entry Check-in:</strong> 08:30 AM IST</p>
                      <p style="margin: 4px 0; color: #cbd5e1; font-size: 13px;">🏟️ <strong>Venue:</strong> FCB International Turf Arena</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- FOOTER & SUPPORT -->
            <tr>
              <td align="center" style="padding: 20px; background: #070a12; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px;">
                <p style="margin: 0 0 8px;">Need help or have questions regarding your match pass?</p>
                <a href="https://wa.me/919876543210?text=Hi%20FCB%20Team%2C%20I%20have%20a%20question%20about%20my%20ticket%20${player.ticketId}" style="color: #00e87a; text-decoration: none; font-weight: 700;">
                  💬 Contact Organizer on WhatsApp
                </a>
                <p style="margin: 15px 0 0; color: #ffb800; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
                  © 2026 FCB Football Club · Copyright : Dos Tanmay- 09
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

// Send Match Pass Welcome Email
export const sendWelcomeMatchPassEmail = async (player: PlayerRegistration) => {
  if (!player.email) {
    console.warn("Player email missing, skipping Brevo welcome email.");
    return { success: false, error: 'Player email missing' };
  }

  const subject = `⚽ Registration Confirmed! Your FCB Tournament Pass [Ticket #${player.ticketId}]`;
  const htmlContent = generateWelcomeMatchPassHTML(player);

  return sendBrevoEmail({
    toEmail: player.email,
    toName: player.name,
    subject,
    htmlContent
  });
};

// Send Approval Status Notification Email
export const sendApprovalStatusEmail = async (player: PlayerRegistration) => {
  if (!player.email) return { success: false, error: 'Email missing' };

  const subject = `🎉 Approved! Your FCB Match Pass is Ready [Ticket #${player.ticketId}]`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #04060d; color: #ffffff; padding: 30px; border-radius: 12px;">
      <h2 style="color: #00e87a;">Congratulations ${player.name}! ⚽</h2>
      <p style="color: #cbd5e1;">Your payment and registration for FCB Tournament 2026 have been <strong>APPROVED</strong> by the organizer.</p>
      <div style="background: #111827; padding: 15px; border-radius: 8px; border: 1px solid #00e87a; margin: 20px 0;">
        <p style="margin:0; font-size: 16px;"><strong>Ticket ID:</strong> <span style="color:#ffb800;">${player.ticketId}</span></p>
        <p style="margin:5px 0 0; font-size: 14px;"><strong>Position:</strong> ${player.position}</p>
        <p style="margin:5px 0 0; font-size: 14px;"><strong>Date:</strong> 23-08-2026 @ 08:30 AM IST</p>
      </div>
      <p>Show your Digital Match Pass QR code at the stadium gate for fast check-in!</p>
    </div>
  `;

  return sendBrevoEmail({
    toEmail: player.email,
    toName: player.name,
    subject,
    htmlContent
  });
};

// Send Test Email from Admin Panel
export const sendBrevoTestEmail = async (testEmail: string) => {
  const subject = `🚀 FCB Tournament - Brevo Integration Test Email`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background: #0b0f19; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #ffb800;">
      <h2 style="color: #ffb800; margin: 0 0 10px;">Brevo Transactional Email Connected! ✅</h2>
      <p style="color: #cbd5e1;">If you are reading this email, your Brevo SMTP API Key is working perfectly in production mode.</p>
      <p style="color: #00e87a; font-weight: bold;">FCB Tournament Portal v13.0</p>
    </div>
  `;

  return sendBrevoEmail({
    toEmail: testEmail,
    toName: 'FCB Organizer Test',
    subject,
    htmlContent
  });
};

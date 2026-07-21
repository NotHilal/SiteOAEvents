// Resend REST API directly via fetch — no SDK dependency, consistent with
// how this project already talks to Nominatim/OSRM/BAN. Stays inert (never
// throws, just skips) until RESEND_API_KEY is set, same pattern as
// src/lib/stripe.js's isStripeConfigured().
const RESEND_API_URL = 'https://api.resend.com/emails';

export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail({ to, subject, html }) {
  if (!isEmailConfigured()) {
    console.warn(`[email] RESEND_API_KEY manquant — email "${subject}" à ${to} non envoyé.`);
    return { skipped: true };
  }
  const from = process.env.EMAIL_FROM || 'OA Événementiel <onboarding@resend.dev>';
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }
  return res.json();
}

function layout(preheader, bodyHtml) {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f7f6f4;font-family:Arial,Helvetica,sans-serif;">
  <span style="display:none;font-size:0;color:#f7f6f4;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f4;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:4px;overflow:hidden;">
        <tr><td style="background:#000000;padding:24px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:1px;">OA <span style="color:#c9a15a;">Événementiel</span></span>
        </td></tr>
        <tr><td style="padding:32px;color:#1a1a1a;font-size:15px;line-height:1.6;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f7f6f4;color:#888;font-size:12px;">
          OA Événementiel — Île-de-France
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function trackingButton(trackingUrl) {
  return `<a href="${trackingUrl}" style="display:inline-block;margin-top:20px;background:#c9a15a;color:#ffffff;text-decoration:none;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px;padding:14px 28px;border-radius:2px;">Suivre ma demande</a>`;
}

export function confirmationEmail({ name, reference, dateLabel, grandTotal, trackingUrl }) {
  const subject = `Votre réservation ${reference} est confirmée — OA Événementiel`;
  const html = layout(subject, `
    <p>Bonjour ${escapeHtml(name)},</p>
    <p>Bonne nouvelle — votre demande de réservation pour le <strong>${escapeHtml(dateLabel)}</strong> est <strong style="color:#2e7d32;">confirmée</strong> !</p>
    <p style="background:#f7f6f4;border-radius:4px;padding:16px 20px;margin:20px 0;">
      Numéro de commande : <strong style="letter-spacing:1px;">${escapeHtml(reference)}</strong><br/>
      Montant total estimé : <strong>${grandTotal.toFixed(2)} €</strong>
    </p>
    <p>Pour finaliser votre réservation, il ne reste plus qu'à régler votre premier versement. Cliquez ci-dessous et entrez votre numéro de commande avec votre email pour accéder aux moyens de paiement.</p>
    ${trackingButton(trackingUrl)}
    <p style="margin-top:24px;color:#666;font-size:13px;">Conservez ce numéro de commande — il vous permettra de suivre votre demande et de régler vos versements à tout moment.</p>
  `);
  return { subject, html };
}

export function refusalEmail({ name, reference }) {
  const subject = `Votre demande ${reference} — OA Événementiel`;
  const html = layout(subject, `
    <p>Bonjour ${escapeHtml(name)},</p>
    <p>Nous sommes désolés — nous ne sommes malheureusement pas en mesure de donner suite à votre demande de réservation (référence <strong>${escapeHtml(reference)}</strong>) pour la date sélectionnée.</p>
    <p>N'hésitez pas à nous recontacter pour explorer d'autres dates disponibles.</p>
    <p style="margin-top:20px;">L'équipe OA Événementiel</p>
  `);
  return { subject, html };
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

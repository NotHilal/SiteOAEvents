// Resend REST API directly via fetch — no SDK dependency, consistent with
// how this project already talks to Nominatim/OSRM/BAN. Stays inert (never
// throws, just skips) until RESEND_API_KEY is set, same pattern as
// src/lib/stripe.js's isStripeConfigured().
const RESEND_API_URL = 'https://api.resend.com/emails';

export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail({ to, subject, html, idempotencyKey, timeoutMs = 10000 }) {
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
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify({ from, to, subject, html }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }
  return res.json();
}

export function passwordResetEmail({ name, resetUrl }) {
  const subject = 'Réinitialiser votre mot de passe — OA Événementiel';
  return { subject, html: layout(subject, `<p>Bonjour ${escapeHtml(name)},</p><p>Vous avez demandé à réinitialiser le mot de passe de votre compte client.</p><p><a href="${escapeHtml(resetUrl)}">Choisir un nouveau mot de passe</a></p><p>Ce lien est valable 30 minutes et ne peut être utilisé qu’une fois.</p><p>Si vous n’êtes pas à l’origine de cette demande, ignorez cet email. Votre mot de passe reste inchangé.</p>`) };
}

export function customerWelcomeEmail({ name, accountUrl, trackingUrl }) {
  const subject = 'Bienvenue chez OA Événementiel';
  return { subject, html: layout(subject, `<p>Bonjour ${escapeHtml(name)},</p><p>Votre compte client OA Événementiel a bien été créé.</p><p>Vous pouvez accéder à votre espace personnel et gérer vos coordonnées.</p><p><a href="${escapeHtml(accountUrl)}">Accéder à mon espace client</a></p><p>Pour retrouver une commande, utilisez votre adresse email et son numéro de référence sur la <a href="${escapeHtml(trackingUrl)}">page de suivi</a>.</p><p>Une question ? Écrivez-nous à <a href="mailto:contact@oa-evenementiel.fr">contact@oa-evenementiel.fr</a>.</p>`) };
}

export function passwordChangedEmail({ name }) {
  const subject = 'Votre mot de passe a été modifié — OA Événementiel';
  return { subject, html: layout(subject, `<p>Bonjour ${escapeHtml(name)},</p><p>Le mot de passe de votre compte client vient d’être modifié. Les anciennes sessions ont été déconnectées.</p><p>Si vous n’êtes pas à l’origine de ce changement, contactez-nous à <a href="mailto:contact@oa-evenementiel.fr">contact@oa-evenementiel.fr</a>.</p>`) };
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
  return `<a href="${trackingUrl}" style="display:inline-block;margin-top:20px;background:#c9a15a;color:#ffffff;text-decoration:none;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px;padding:14px 28px;border-radius:2px;">Suivre ma commande</a>`;
}

// Sent as soon as the order is paid — the order is confirmed at that point,
// there is no validation by the team.
export function confirmationEmail({ name, reference, dateLabel, grandTotal, trackingUrl }) {
  const subject = `Commande ${reference} confirmée — OA Événementiel`;
  const html = layout(subject, `
    <p>Bonjour ${escapeHtml(name)},</p>
    <p>Merci pour votre commande ! Votre paiement a bien été reçu et votre location pour le <strong>${escapeHtml(dateLabel)}</strong> est <strong style="color:#2e7d32;">confirmée</strong>.</p>
    <p style="background:#f7f6f4;border-radius:4px;padding:16px 20px;margin:20px 0;">
      Numéro de commande : <strong style="letter-spacing:1px;">${escapeHtml(reference)}</strong><br/>
      Montant payé (TTC, livraison comprise) : <strong>${grandTotal.toFixed(2)} €</strong>
    </p>
    <p>Nous vous contacterons avant l’événement pour caler l’horaire de livraison. Vous pouvez suivre votre commande à tout moment ci-dessous.</p>
    ${trackingButton(trackingUrl)}
  `);
  return { subject, html };
}

export function cancellationEmail({ name, reference, grandTotal, trackingUrl }) {
  const subject = `Commande ${reference} annulée et remboursée — OA Événementiel`;
  const html = layout(subject, `
    <p>Bonjour ${escapeHtml(name)},</p>
    <p>Votre commande <strong>${escapeHtml(reference)}</strong> a été annulée.</p>
    <p style="background:#f7f6f4;border-radius:4px;padding:16px 20px;margin:20px 0;">
      Montant remboursé : <strong>${grandTotal.toFixed(2)} €</strong>
    </p>
    <p>Le remboursement est fait sur le moyen de paiement utilisé ; il apparaît généralement sous 5 à 10 jours ouvrés selon votre banque.</p>
    <p>Une question ? Répondez simplement à cet email.</p>
    ${trackingButton(trackingUrl)}
  `);
  return { subject, html };
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

import crypto from 'crypto';
import db from '../../../src/lib/sqlite-db.js';
import { sendEmail, awaitingPaymentEmail, confirmationEmail, refusalEmail } from '../../../src/lib/email.js';

// Same HMAC bearer-token check duplicated across pages/api/db.js,
// pages/api/upload.js — kept consistent with that existing pattern.
function isAuthorized(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    const token = authHeader.split(' ')[1];
    const [payloadStr, signature] = token.split('.');
    const secret = process.env.JWT_SECRET || 'super_secret_local_key_for_jwt_tokens_12345';
    const expectedSignature = crypto.createHmac('sha256', secret).update(payloadStr).digest('base64');
    if (signature !== expectedSignature) return false;
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64').toString('utf8'));
    if (Date.now() > payload.exp) return false;
    return payload.role === 'authenticated';
  } catch (e) {
    return false;
  }
}

function getSiteUrl(req) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = host && host.includes('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}

// Called by the admin UI right after confirming/refusing a reservation
// (see espace-oa.jsx updateResaStatus). Idempotent via `notified_status` —
// clicking confirm twice, or a flaky retry, won't double-email the client.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ message: 'Unauthorized access' });
  }

  const { reservationId } = req.body || {};
  if (!reservationId) {
    return res.status(400).json({ message: 'reservationId manquant' });
  }

  try {
    const resa = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
    if (!resa) {
      return res.status(404).json({ message: 'Réservation introuvable' });
    }
    if (!['awaiting_payment', 'confirmed', 'refused'].includes(resa.status)) {
      return res.status(400).json({ message: 'Cette réservation n\'est ni acceptée, ni confirmée, ni refusée.' });
    }
    if (resa.notified_status === resa.status) {
      return res.status(200).json({ data: { skipped: true } });
    }

    const name = [resa.prenom, resa.nom].filter(Boolean).join(' ') || 'Client';
    let subject, html;
    if (resa.status === 'awaiting_payment' || resa.status === 'confirmed') {
      const dates = (() => { try { return JSON.parse(resa.dates) || [resa.date]; } catch { return [resa.date]; } })();
      const dateLabel = new Date(dates[0] + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      const trackingUrl = `${getSiteUrl(req)}/suivi`;
      const emailFn = resa.status === 'awaiting_payment' ? awaitingPaymentEmail : confirmationEmail;
      ({ subject, html } = emailFn({ name, reference: resa.reference, dateLabel, grandTotal: resa.grand_total || 0, trackingUrl }));
    } else {
      ({ subject, html } = refusalEmail({ name, reference: resa.reference }));
    }

    await sendEmail({ to: resa.email, subject, html });
    db.prepare('UPDATE reservations SET notified_status = ? WHERE id = ?').run(resa.status, resa.id);

    return res.status(200).json({ data: { sent: true } });
  } catch (error) {
    console.error('[Notify Reservation Error]', error);
    return res.status(500).json({ message: error.message || "Erreur lors de l'envoi de la notification" });
  }
}

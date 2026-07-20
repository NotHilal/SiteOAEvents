import db from '../../../src/lib/sqlite-db.js';
import { isStripeConfigured } from '../../../src/lib/stripe.js';

// Public, read-only, booleans only — lets the reservation page know whether
// to show a payment step at all, and which option(s) to offer, without
// exposing the IBAN or any secret. Until an admin fills in Stripe keys
// and/or a bank IBAN in Réglages, both are false and the reservation flow
// falls back to its original "just submit the request" behavior.
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  const row = db.prepare("SELECT value FROM settings WHERE key = 'bank_iban'").get();
  return res.status(200).json({
    data: {
      card: isStripeConfigured(),
      virement: !!(row && row.value),
    },
  });
}

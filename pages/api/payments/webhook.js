import db from '../../../src/lib/sqlite-db.js';
import { getStripe, isStripeConfigured } from '../../../src/lib/stripe.js';

// Stripe requires the exact raw request body to verify the signature —
// Next's default JSON body parser would re-serialize it and break that,
// same reason pages/api/upload.js disables it for multipart bodies.
export const config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ message: 'Webhook Stripe non configuré' });
  }

  const stripe = getStripe();
  const rawBody = await readRawBody(req);
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    // Signature check is what makes this endpoint trustworthy — never skip
    // it or process the body if it fails, that would let anyone fake a
    // "payment succeeded" event.
    console.error('[Stripe Webhook] Signature invalide', err.message);
    return res.status(400).json({ message: `Webhook signature invalide: ${err.message}` });
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const payment = db.prepare('SELECT * FROM payments WHERE stripe_payment_intent_id = ?').get(intent.id);
      if (payment) {
        db.prepare("UPDATE payments SET status = 'paid', paid_at = ? WHERE id = ?").run(new Date().toISOString(), payment.id);

        // First installment: remember the payment method as the customer's
        // default so later installments can be charged off-session without
        // the client re-entering their card (see chargeInstallmentOffSession
        // in src/lib/stripe.js).
        if (payment.installment_index === 0 && intent.customer && intent.payment_method) {
          await stripe.customers.update(intent.customer, {
            invoice_settings: { default_payment_method: intent.payment_method },
          });
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      const payment = db.prepare('SELECT * FROM payments WHERE stripe_payment_intent_id = ?').get(intent.id);
      if (payment) {
        const message = intent.last_payment_error?.message || 'Paiement refusé';
        db.prepare("UPDATE payments SET status = 'failed', failure_message = ? WHERE id = ?").run(message, payment.id);
      }
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook Handler Error]', error);
    // Still 200 here would hide real bugs from Stripe's retry mechanism —
    // return 500 so Stripe retries delivery.
    return res.status(500).json({ message: 'Erreur de traitement du webhook' });
  }
}

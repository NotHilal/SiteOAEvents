import db from '../../../src/lib/sqlite-db.js';
import { getStripe, isStripeConfigured, createInstallmentAutoCharge } from '../../../src/lib/stripe.js';

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
        // default (needed for the auto-charges below to work off-session),
        // then schedule every remaining installment as its own independent
        // Stripe Subscription Schedule — only done now, once we know the
        // card actually works and is saved, never before.
        if (payment.installment_index === 0 && intent.customer && intent.payment_method) {
          await stripe.customers.update(intent.customer, {
            invoice_settings: { default_payment_method: intent.payment_method },
          });

          const remaining = db.prepare(
            "SELECT * FROM payments WHERE reservation_id = ? AND installment_index > 0 AND method = 'card' AND status = 'pending'"
          ).all(payment.reservation_id);
          for (const installment of remaining) {
            try {
              const schedule = await createInstallmentAutoCharge({
                customerId: intent.customer,
                amount: installment.amount,
                dueDateStr: installment.due_date,
                reservationId: payment.reservation_id,
                installmentId: installment.id,
              });
              db.prepare('UPDATE payments SET stripe_subscription_id = ? WHERE id = ?').run(schedule.id, installment.id);
            } catch (err) {
              console.error('[Stripe Webhook] Échec de la planification du versement', installment.id, err.message);
            }
          }
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      const payment = db.prepare('SELECT * FROM payments WHERE stripe_payment_intent_id = ?').get(intent.id);
      if (payment) {
        const message = intent.last_payment_error?.message || 'Paiement refusé';
        db.prepare("UPDATE payments SET status = 'failed', failure_message = ? WHERE id = ?").run(message, payment.id);
      }
    } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      // Later installments are billed through a per-installment Subscription
      // Schedule (see createInstallmentAutoCharge) — the invoice only
      // carries the underlying subscription id, so we look up that
      // subscription's `.schedule` (the id we stored on the payment row)
      // to find which installment this is.
      const invoice = event.data.object;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const payment = sub.schedule
          ? db.prepare('SELECT * FROM payments WHERE stripe_subscription_id = ?').get(sub.schedule)
          : null;
        if (payment) {
          if (event.type === 'invoice.paid') {
            db.prepare("UPDATE payments SET status = 'paid', paid_at = ? WHERE id = ?").run(new Date().toISOString(), payment.id);
          } else {
            const message = invoice.last_finalization_error?.message || 'Prélèvement automatique refusé';
            db.prepare("UPDATE payments SET status = 'failed', failure_message = ? WHERE id = ?").run(message, payment.id);
          }
        }
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

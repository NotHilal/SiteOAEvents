import Stripe from 'stripe';

// Lazy singleton: instantiating Stripe with an empty key throws immediately,
// which would crash every page (this module gets pulled in by API routes
// that run on every request) if STRIPE_SECRET_KEY isn't set yet. Deferring
// construction to first real use means the rest of the site keeps working
// with payments simply unavailable until the keys are added to .env.
let _stripe = null;
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY manquant — configurez les clés Stripe dans .env pour activer le paiement en ligne.');
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20', timeout: 10000, maxNetworkRetries: 2 });
  }
  return _stripe;
}

export function isStripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

// Online ordering needs both keys. The webhook secret is strongly
// recommended in production (it confirms payments even if the customer
// closes the tab), but the return page also confirms them, so checkout
// works without it.
export function isCheckoutConfigured() {
  return isStripeConfigured() && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}

/**
 * One PaymentIntent per order, for the full amount. `automatic_payment_methods`
 * lets the Payment Element offer every method switched on in the Stripe
 * dashboard (Paramètres > Moyens de paiement): card, Apple Pay, Google Pay,
 * PayPal… — adding one there needs no code change. The idempotency key ties
 * it to the order, so a retried checkout never charges twice.
 */
export async function createOrderPaymentIntent(order) {
  return getStripe().paymentIntents.create({
    amount: Math.round(order.grand_total * 100),
    currency: 'eur',
    automatic_payment_methods: { enabled: true },
    receipt_email: order.email,
    description: `Commande ${order.reference} — OA Événementiel`,
    metadata: { reservation_id: order.id, reference: order.reference },
  }, { idempotencyKey: `order-payment:${order.id}` });
}

// Full refund of an order's payment (Espace OA > Annuler et rembourser).
export async function refundOrderPayment(paymentIntentId, reservationId) {
  return getStripe().refunds.create({
    payment_intent: paymentIntentId,
    metadata: { reservation_id: reservationId },
  }, { idempotencyKey: `order-refund:${reservationId}` });
}

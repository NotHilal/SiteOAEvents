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
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  }
  return _stripe;
}

export function isStripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Splits `grandTotal` into an installment schedule paid before `eventDateStr`
 * (the first day of the reservation). The schedule adapts to how much lead
 * time there is:
 *  - < 10 days out  : single full payment now (no time for installments)
 *  - < 37 days out  : 2 installments — 50% now, 50% at J-7
 *  - otherwise      : 3 installments — 30% now, 40% at J-30, 30% at J-7
 * The last installment absorbs any rounding remainder so the sum always
 * equals grandTotal exactly.
 */
export function computeInstallmentSchedule(grandTotal, eventDateStr, now = new Date()) {
  const total = Math.round((parseFloat(grandTotal) || 0) * 100) / 100;
  const eventDate = new Date(eventDateStr + 'T00:00:00');
  const daysUntilEvent = Math.floor((eventDate.getTime() - now.getTime()) / DAY_MS);
  const today = fmtDate(now);

  let parts; // [{ ratio, label, dueDate }]
  if (daysUntilEvent < 10) {
    parts = [{ ratio: 1, label: 'Paiement intégral', dueDate: today }];
  } else if (daysUntilEvent < 37) {
    parts = [
      { ratio: 0.5, label: 'Acompte (50%)', dueDate: today },
      { ratio: 0.5, label: 'Solde (50%) — J-7', dueDate: fmtDate(addDays(eventDate, -7)) },
    ];
  } else {
    parts = [
      { ratio: 0.3, label: 'Acompte (30%)', dueDate: today },
      { ratio: 0.4, label: '2ème versement (40%) — J-30', dueDate: fmtDate(addDays(eventDate, -30)) },
      { ratio: 0.3, label: 'Solde (30%) — J-7', dueDate: fmtDate(addDays(eventDate, -7)) },
    ];
  }

  const schedule = parts.map((p, i) => ({
    index: i,
    label: p.label,
    dueDate: p.dueDate,
    amount: Math.round(total * p.ratio * 100) / 100,
  }));
  const roundedSum = schedule.reduce((s, p) => s + p.amount, 0);
  const remainder = Math.round((total - roundedSum) * 100) / 100;
  if (remainder !== 0) {
    schedule[schedule.length - 1].amount = Math.round((schedule[schedule.length - 1].amount + remainder) * 100) / 100;
  }
  return schedule;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function fmtDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export async function getOrCreateCustomer(reservation) {
  const stripe = getStripe();
  if (reservation.stripe_customer_id) {
    return reservation.stripe_customer_id;
  }
  const name = [reservation.prenom, reservation.nom].filter(Boolean).join(' ') || undefined;
  const customer = await stripe.customers.create({
    email: reservation.email,
    name,
    phone: reservation.phone || undefined,
    metadata: { reservation_id: reservation.id },
  });
  return customer.id;
}

/**
 * Creates the PaymentIntent for the first installment. `setup_future_usage`
 * saves the payment method on the customer so later installments can be
 * charged off-session by the scheduled script without the client re-entering
 * their card.
 */
export async function createFirstInstallmentIntent({ customerId, amount, reservationId, installmentId }) {
  const stripe = getStripe();
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'eur',
    customer: customerId,
    setup_future_usage: 'off_session',
    automatic_payment_methods: { enabled: true },
    metadata: { reservation_id: reservationId, installment_id: installmentId },
  });
}

/**
 * Charges a later installment off-session using the payment method saved
 * from the first payment. Called by scripts/run-scheduled-payments.js, never
 * directly by the client.
 */
export async function chargeInstallmentOffSession({ customerId, amount, reservationId, installmentId }) {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  const paymentMethodId = typeof customer.invoice_settings?.default_payment_method === 'string'
    ? customer.invoice_settings.default_payment_method
    : customer.invoice_settings?.default_payment_method?.id;
  if (!paymentMethodId) {
    throw new Error(`Aucun moyen de paiement enregistré pour le client ${customerId} (réservation ${reservationId}).`);
  }
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'eur',
    customer: customerId,
    payment_method: paymentMethodId,
    off_session: true,
    confirm: true,
    metadata: { reservation_id: reservationId, installment_id: installmentId },
  });
}

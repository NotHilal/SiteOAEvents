import Stripe from 'stripe';
import db from './sqlite-db.js';

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

async function getSetting(key, fallback) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row && row.value != null && row.value !== '' ? row.value : fallback;
}
async function getSettingNumber(key, fallback) {
  const parsed = parseFloat(await getSetting(key, String(fallback)));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

// The last installment of any plan always falls 3 days before the event —
// close enough to the date that materials/logistics are locked in, but with
// enough buffer to actually process the charge. Not admin-configurable: it's
// a fixed anchor the automatic schedule below is built around.
const LAST_INSTALLMENT_DAYS_BEFORE_EVENT = 3;

// Per-tier config for the 2x/3x/4x installment plans — only the minimum
// order amount is admin-configurable (Espace OA > Réglages > Paiement en
// plusieurs fois); the schedule's dates are computed automatically (see
// computeInstallmentSchedule) rather than set per-tier.
export async function getTierConfig(tier) {
  if (tier === 2) return { minAmount: await getSettingNumber('installment_2x_min_amount', 0) };
  if (tier === 3) return { minAmount: await getSettingNumber('installment_3x_min_amount', 0) };
  if (tier === 4) return { minAmount: await getSettingNumber('installment_min_total_4x', 300) };
  return null;
}

// Used by /api/payments/methods (and re-checked server-side in
// create-intent.js) to decide whether a given 2x/3x/4x plan should be
// offered for a specific reservation, and if not, why — rather than
// showing a choice that create-intent would then reject. A tier is eligible
// only if there's enough room between now and (event - 3 days) to space out
// its installments at least a day apart.
export async function getInstallmentTierEligibility(tier, grandTotal, eventDateStr, now = new Date()) {
  if (tier === 1) return { eligible: true, reason: null };
  const cfg = await getTierConfig(tier);
  if (!cfg) return { eligible: false, reason: 'Option indisponible.' };
  const n = tier;
  const eventDate = new Date(eventDateStr + 'T00:00:00');
  const lastDueDate = addDays(eventDate, -LAST_INSTALLMENT_DAYS_BEFORE_EVENT);
  const daysWindow = Math.floor((lastDueDate.getTime() - now.getTime()) / DAY_MS);
  if (daysWindow < n - 1) {
    const minDaysNeeded = LAST_INSTALLMENT_DAYS_BEFORE_EVENT + (n - 1);
    return { eligible: false, reason: `Disponible uniquement si l'événement a lieu dans plus de ${minDaysNeeded} jours.` };
  }
  const total = parseFloat(grandTotal) || 0;
  if (cfg.minAmount > 0 && total < cfg.minAmount) {
    return { eligible: false, reason: `Disponible à partir de ${cfg.minAmount} € de commande.` };
  }
  return { eligible: true, reason: null };
}

export async function getAllInstallmentTiers(grandTotal, eventDateStr, now = new Date()) {
  const [t2, t3, t4] = await Promise.all([
    getInstallmentTierEligibility(2, grandTotal, eventDateStr, now),
    getInstallmentTierEligibility(3, grandTotal, eventDateStr, now),
    getInstallmentTierEligibility(4, grandTotal, eventDateStr, now),
  ]);
  return { 2: t2, 3: t3, 4: t4 };
}

/**
 * Builds the installment schedule for an explicitly-chosen plan: `tier` is
 * 1 (full payment) or 2/3/4 (that many equal installments). The dates are
 * computed automatically rather than read from fixed offsets: the first
 * installment is always due today, the last is always due
 * LAST_INSTALLMENT_DAYS_BEFORE_EVENT days before the event, and any
 * installments in between are spread evenly across that window — so the
 * schedule adapts on its own to however much time is actually left, instead
 * of assuming a lead time long enough for admin-set fixed offsets to fit.
 * The last installment absorbs any rounding remainder so the sum always
 * equals grandTotal exactly.
 */
export function computeInstallmentSchedule(grandTotal, eventDateStr, tier = 1, now = new Date()) {
  const total = Math.round((parseFloat(grandTotal) || 0) * 100) / 100;
  const today = fmtDate(now);
  const n = [2, 3, 4].includes(tier) ? tier : 1;

  let parts;
  if (n === 1) {
    parts = [{ label: 'Paiement intégral', dueDate: today }];
  } else {
    const eventDate = new Date(eventDateStr + 'T00:00:00');
    const lastDueDate = addDays(eventDate, -LAST_INSTALLMENT_DAYS_BEFORE_EVENT);
    const daysWindow = Math.max(0, Math.floor((lastDueDate.getTime() - now.getTime()) / DAY_MS));
    parts = Array.from({ length: n }, (_, i) => ({
      label: i === 0 ? `Acompte (1/${n})` : i === n - 1 ? `Solde (1/${n})` : `${i + 1}ème versement (1/${n})`,
      dueDate: fmtDate(addDays(now, Math.round((i * daysWindow) / (n - 1)))),
    }));
  }

  const base = Math.round((total / parts.length) * 100) / 100;
  const schedule = parts.map((p, i) => ({ index: i, label: p.label, dueDate: p.dueDate, amount: base }));
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
 * Creates the PaymentIntent for the first installment. Card-only on purpose
 * — `payment_method_types: ['card']` instead of `automatic_payment_methods`
 * means Stripe's PaymentElement renders straight to the card form with no
 * method switcher (no Klarna/Bancontact/Amazon Pay/Satispay/etc. tabs).
 * `setup_future_usage` saves the card on the customer so later installments
 * can be scheduled with Stripe once this first one succeeds (see
 * createInstallmentAutoCharge) — only requested when there actually IS a
 * later installment to charge.
 */
export async function createFirstInstallmentIntent({ customerId, amount, reservationId, installmentId, needsFutureUsage }) {
  const stripe = getStripe();
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'eur',
    customer: customerId,
    ...(needsFutureUsage ? { setup_future_usage: 'off_session' } : {}),
    payment_method_types: ['card'],
    metadata: { reservation_id: reservationId, installment_id: installmentId },
  });
}

// A Subscription Schedule phase needs a real Product (inline product data
// isn't accepted there, unlike on a plain PaymentIntent/invoice item) — one
// generic product is created once and reused for every installment charge,
// its id cached in `settings` so we don't create a duplicate on every call.
async function getInstallmentProductId() {
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'stripe_installment_product_id'").get();
  if (row?.value) return row.value;
  const stripe = getStripe();
  const product = await stripe.products.create({ name: 'Versement de réservation' });
  await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('stripe_installment_product_id', ?, ?)")
    .run(product.id, new Date().toISOString());
  return product.id;
}

/**
 * Schedules a single future installment to be charged automatically, on its
 * due date, against the customer's saved default payment method — via a
 * dedicated Stripe Subscription Schedule with a single one-off phase
 * (`iterations: 1`, `end_behavior: 'cancel'`).
 *
 * Each installment gets its OWN independent schedule rather than sharing one
 * schedule with a phase per installment: Stripe's dunning/cancellation
 * behavior (a subscription can go `unpaid` after exhausted retries, after
 * which Stripe stops actively collecting its future invoices) is scoped to
 * a single subscription. Keeping every installment on its own schedule means
 * one failing/exhausted installment can never silently stop the others from
 * being collected.
 */
export async function createInstallmentAutoCharge({ customerId, amount, dueDateStr, reservationId, installmentId }) {
  const stripe = getStripe();
  const productId = await getInstallmentProductId();
  const dueTs = Math.floor(new Date(dueDateStr + 'T09:00:00').getTime() / 1000);
  const nowTs = Math.floor(Date.now() / 1000);
  return stripe.subscriptionSchedules.create({
    customer: customerId,
    start_date: dueTs > nowTs ? dueTs : 'now',
    end_behavior: 'cancel',
    phases: [{
      items: [{
        price_data: { currency: 'eur', product: productId, unit_amount: Math.round(amount * 100), recurring: { interval: 'month' } },
        quantity: 1,
      }],
      iterations: 1,
      collection_method: 'charge_automatically',
    }],
    metadata: { reservation_id: reservationId, installment_id: installmentId },
  });
}

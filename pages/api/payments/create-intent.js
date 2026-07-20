import crypto from 'crypto';
import db from '../../../src/lib/sqlite-db.js';
import { isStripeConfigured, getStripe, getOrCreateCustomer, computeInstallmentSchedule, createFirstInstallmentIntent } from '../../../src/lib/stripe.js';

// Public on purpose: the client calls this right after submitting their own
// reservation, before ever logging in. The reservation's id (a
// crypto.randomUUID(), unguessable) acts as the implicit capability — same
// trust model as a password-reset link. It only ever reads/mutates the one
// reservation whose id was supplied.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  if (!isStripeConfigured()) {
    return res.status(503).json({ message: "Le paiement en ligne n'est pas encore configuré (clés Stripe manquantes)." });
  }

  const { reservationId } = req.body || {};
  if (!reservationId) {
    return res.status(400).json({ message: 'reservationId manquant' });
  }

  try {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
    if (!reservation) {
      return res.status(404).json({ message: 'Réservation introuvable' });
    }
    if (!reservation.grand_total || reservation.grand_total <= 0) {
      return res.status(400).json({ message: 'Aucun montant à payer pour cette réservation' });
    }

    const existing = db.prepare('SELECT * FROM payments WHERE reservation_id = ? ORDER BY installment_index').all(reservationId);

    if (existing.length > 0) {
      // Already initialized (e.g. page refresh) — return the existing schedule
      // and re-fetch the first installment's client secret instead of creating
      // duplicate rows/PaymentIntents.
      const first = existing[0];
      if (!first.stripe_payment_intent_id) {
        return res.status(409).json({ message: 'Le premier versement est dans un état incohérent, contactez-nous.' });
      }
      const stripe = getStripe();
      const intent = await stripe.paymentIntents.retrieve(first.stripe_payment_intent_id);
      return res.status(200).json({
        data: {
          clientSecret: intent.client_secret,
          schedule: existing.map(p => ({ index: p.installment_index, label: p.installment_label, dueDate: p.due_date, amount: p.amount, status: p.status })),
        },
      });
    }

    const eventDate = (() => {
      try { return (JSON.parse(reservation.dates) || [])[0] || reservation.date; } catch { return reservation.date; }
    })();
    const schedule = computeInstallmentSchedule(reservation.grand_total, eventDate);

    const customerId = await getOrCreateCustomer(reservation);
    if (!reservation.stripe_customer_id) {
      db.prepare('UPDATE reservations SET stripe_customer_id = ?, payment_method = ? WHERE id = ?').run(customerId, 'card', reservationId);
    }

    const now = new Date().toISOString();
    const insertPayment = db.prepare(`
      INSERT INTO payments (id, reservation_id, method, amount, installment_index, installment_label, due_date, status, created_at)
      VALUES (?, ?, 'card', ?, ?, ?, ?, 'pending', ?)
    `);
    const paymentIds = schedule.map(() => crypto.randomUUID());
    const transaction = db.transaction(() => {
      schedule.forEach((installment, i) => {
        insertPayment.run(paymentIds[i], reservationId, installment.amount, installment.index, installment.label, installment.dueDate, now);
      });
    });
    transaction();

    const firstIntent = await createFirstInstallmentIntent({
      customerId,
      amount: schedule[0].amount,
      reservationId,
      installmentId: paymentIds[0],
    });
    db.prepare('UPDATE payments SET stripe_payment_intent_id = ? WHERE id = ?').run(firstIntent.id, paymentIds[0]);

    return res.status(200).json({
      data: {
        clientSecret: firstIntent.client_secret,
        schedule: schedule.map((s, i) => ({ index: s.index, label: s.label, dueDate: s.dueDate, amount: s.amount, status: 'pending' })),
      },
    });
  } catch (error) {
    console.error('[Payments create-intent Error]', error);
    return res.status(500).json({ message: error.message || 'Erreur lors de la création du paiement' });
  }
}

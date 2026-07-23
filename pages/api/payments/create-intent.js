import crypto from 'crypto';
import db from '../../../src/lib/sqlite-db.js';
import { isStripeConfigured, getStripe, getOrCreateCustomer, computeInstallmentSchedule, createFirstInstallmentIntent, getInstallmentTierEligibility } from '../../../src/lib/stripe.js';

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
  const plan = req.body?.plan;
  if (!reservationId) {
    return res.status(400).json({ message: 'reservationId manquant' });
  }
  const tier = plan == null ? 1 : parseInt(plan, 10);
  if (![1, 2, 3, 4].includes(tier)) {
    return res.status(400).json({ message: 'plan invalide' });
  }

  try {
    const reservation = await db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
    if (!reservation) {
      return res.status(404).json({ message: 'Réservation introuvable' });
    }
    if (!reservation.grand_total || reservation.grand_total <= 0) {
      return res.status(400).json({ message: 'Aucun montant à payer pour cette réservation' });
    }

    // CardPaymentForm's PaymentElement is told never to collect
    // name/email/phone itself (that's what removes Stripe's "Link" inline
    // signup panel) — Stripe then requires that same data supplied via
    // confirmParams.payment_method_data.billing_details when confirming.
    // We already have it from the reservation form, so hand it back here
    // rather than asking the client to re-enter what they already gave us.
    const billingDetails = {
      name: [reservation.prenom, reservation.nom].filter(Boolean).join(' ') || undefined,
      email: reservation.email || undefined,
      phone: reservation.phone || undefined,
    };

    const existing = await db.prepare('SELECT * FROM payments WHERE reservation_id = ? ORDER BY installment_index').all(reservationId);

    if (existing.length > 0 && existing.some(p => p.status === 'paid')) {
      // At least one installment has already been charged — the schedule is
      // a financial commitment at this point, so it stays locked in even if
      // Réglages changes afterward. Just return it (e.g. page refresh) and
      // re-fetch the first installment's client secret instead of creating
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
          billingDetails,
        },
      });
    }

    if (existing.length > 0) {
      // Nothing has actually been charged yet, so nothing is really "locked
      // in" — discard the stale rows/intent and rebuild below against the
      // current Réglages settings and the plan the client just picked.
      // Otherwise an admin changing the installment settings (or a client
      // picking a different plan than before) would silently keep seeing
      // the old schedule forever.
      const stripe = getStripe();
      for (const p of existing) {
        if (p.stripe_payment_intent_id) {
          try { await stripe.paymentIntents.cancel(p.stripe_payment_intent_id); } catch {}
        }
        if (p.stripe_subscription_id) {
          try { await stripe.subscriptionSchedules.cancel(p.stripe_subscription_id); } catch {}
        }
      }
      await db.prepare('DELETE FROM payments WHERE reservation_id = ?').run(reservationId);
    }

    const eventDate = (() => {
      try { return (JSON.parse(reservation.dates) || [])[0] || reservation.date; } catch { return reservation.date; }
    })();

    // Re-validate server-side — the client only sees eligibility as of when
    // it last loaded /api/payments/methods, which could be stale (or simply
    // bypassed) by the time this request arrives.
    const eligibility = await getInstallmentTierEligibility(tier, reservation.grand_total, eventDate, new Date());
    if (!eligibility.eligible) {
      return res.status(400).json({ message: eligibility.reason || 'Ce plan de paiement n\'est pas disponible pour cette réservation.' });
    }

    const schedule = computeInstallmentSchedule(reservation.grand_total, eventDate, tier, new Date());

    const customerId = await getOrCreateCustomer(reservation);
    if (!reservation.stripe_customer_id) {
      await db.prepare('UPDATE reservations SET stripe_customer_id = ?, payment_method = ? WHERE id = ?').run(customerId, 'card', reservationId);
    }

    const now = new Date().toISOString();
    const insertPayment = db.prepare(`
      INSERT INTO payments (id, reservation_id, method, amount, installment_index, installment_label, due_date, status, created_at)
      VALUES (?, ?, 'card', ?, ?, ?, ?, 'pending', ?)
    `);
    const paymentIds = schedule.map(() => crypto.randomUUID());
    const transaction = db.transaction(async () => {
      for (let i = 0; i < schedule.length; i++) {
        const installment = schedule[i];
        await insertPayment.run(paymentIds[i], reservationId, installment.amount, installment.index, installment.label, installment.dueDate, now);
      }
    });
    await transaction();

    const firstIntent = await createFirstInstallmentIntent({
      customerId,
      amount: schedule[0].amount,
      reservationId,
      installmentId: paymentIds[0],
      needsFutureUsage: schedule.length > 1,
    });
    await db.prepare('UPDATE payments SET stripe_payment_intent_id = ? WHERE id = ?').run(firstIntent.id, paymentIds[0]);

    return res.status(200).json({
      data: {
        clientSecret: firstIntent.client_secret,
        schedule: schedule.map((s, i) => ({ index: s.index, label: s.label, dueDate: s.dueDate, amount: s.amount, status: 'pending' })),
        billingDetails,
      },
    });
  } catch (error) {
    console.error('[Payments create-intent Error]', error);
    return res.status(500).json({ message: error.message || 'Erreur lors de la création du paiement' });
  }
}

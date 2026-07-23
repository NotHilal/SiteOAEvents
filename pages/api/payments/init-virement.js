import crypto from 'crypto';
import db from '../../../src/lib/sqlite-db.js';
import { computeInstallmentSchedule, getInstallmentTierEligibility } from '../../../src/lib/stripe.js';

// Public on purpose, same trust model as create-intent.js: the reservation's
// unguessable id is the capability. No Stripe involved at all here — this
// just records the installment plan and hands back the bank details so the
// client knows what to transfer and when. The admin marks each installment
// as received manually once the money actually lands (see
// pages/api/payments/[reservationId].js).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
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

    const bankRows = await db.prepare("SELECT key, value FROM settings WHERE key IN ('bank_holder','bank_iban','bank_bic')").all();
    const bank = {};
    bankRows.forEach(r => { bank[r.key] = r.value; });
    if (!bank.bank_iban) {
      return res.status(503).json({ message: "Le virement bancaire n'est pas encore configuré (IBAN manquant dans Réglages)." });
    }

    let existing = await db.prepare('SELECT * FROM payments WHERE reservation_id = ? ORDER BY installment_index').all(reservationId);

    if (existing.length > 0 && !existing.some(p => p.status === 'paid')) {
      // Nothing has actually been received yet, so nothing is locked in —
      // discard the stale schedule and rebuild it below against the current
      // Réglages settings / the plan the client just picked. Otherwise an
      // admin changing the installment settings (or the client picking a
      // different plan) would silently keep seeing the old schedule.
      await db.prepare('DELETE FROM payments WHERE reservation_id = ?').run(reservationId);
      existing = [];
    }

    if (existing.length === 0) {
      const eventDate = (() => {
        try { return (JSON.parse(reservation.dates) || [])[0] || reservation.date; } catch { return reservation.date; }
      })();
      const eligibility = await getInstallmentTierEligibility(tier, reservation.grand_total, eventDate, new Date());
      if (!eligibility.eligible) {
        return res.status(400).json({ message: eligibility.reason || 'Ce plan de paiement n\'est pas disponible pour cette réservation.' });
      }
      const schedule = computeInstallmentSchedule(reservation.grand_total, eventDate, tier, new Date());
      const now = new Date().toISOString();
      const insertPayment = db.prepare(`
        INSERT INTO payments (id, reservation_id, method, amount, installment_index, installment_label, due_date, status, created_at)
        VALUES (?, ?, 'virement', ?, ?, ?, ?, 'pending', ?)
      `);
      const transaction = db.transaction(async () => {
        for (const installment of schedule) {
          await insertPayment.run(crypto.randomUUID(), reservationId, installment.amount, installment.index, installment.label, installment.dueDate, now);
        }
      });
      await transaction();
      await db.prepare("UPDATE reservations SET payment_method = 'virement' WHERE id = ?").run(reservationId);
      existing = await db.prepare('SELECT * FROM payments WHERE reservation_id = ? ORDER BY installment_index').all(reservationId);
    }

    return res.status(200).json({
      data: {
        bank: { holder: bank.bank_holder || '', iban: bank.bank_iban, bic: bank.bank_bic || '' },
        schedule: existing.map(p => ({ index: p.installment_index, label: p.installment_label, dueDate: p.due_date, amount: p.amount, status: p.status })),
      },
    });
  } catch (error) {
    console.error('[Payments init-virement Error]', error);
    return res.status(500).json({ message: error.message || "Erreur lors de l'initialisation du virement" });
  }
}

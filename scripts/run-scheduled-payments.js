// Charges any card installment that's due today or earlier, using the
// payment method saved from the customer's first payment (see
// invoice_settings.default_payment_method, set by pages/api/payments/webhook.js
// when the first installment succeeds).
//
// This project is self-hosted and has no built-in scheduler, so this script
// is meant to be run once a day by an external trigger — e.g. Windows Task
// Scheduler running `node scripts/run-scheduled-payments.js` from the
// project directory, or a cron job if hosted on Linux/a VPS. It does
// nothing (and exits 0) if Stripe isn't configured or there's nothing due.
//
// Bank transfer ("virement") installments are NOT touched here — those are
// confirmed manually by the admin in espace-oa once the money is seen to
// have arrived, since there's no way to auto-detect an incoming transfer
// without a separate banking integration.

import db from '../src/lib/sqlite-db.js';
import { isStripeConfigured, chargeInstallmentOffSession } from '../src/lib/stripe.js';

function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function run() {
  if (!isStripeConfigured()) {
    console.log('[run-scheduled-payments] Stripe non configuré — rien à faire.');
    return;
  }

  const due = db.prepare(`
    SELECT * FROM payments
    WHERE method = 'card' AND status = 'pending' AND installment_index > 0 AND due_date <= ?
    ORDER BY due_date
  `).all(today());

  if (!due.length) {
    console.log('[run-scheduled-payments] Aucune échéance due aujourd\'hui.');
    return;
  }

  console.log(`[run-scheduled-payments] ${due.length} échéance(s) à prélever.`);

  for (const installment of due) {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(installment.reservation_id);
    if (!reservation || !reservation.stripe_customer_id) {
      console.error(`[run-scheduled-payments] Réservation/client Stripe introuvable pour le versement ${installment.id}, ignoré.`);
      continue;
    }
    try {
      const intent = await chargeInstallmentOffSession({
        customerId: reservation.stripe_customer_id,
        amount: installment.amount,
        reservationId: reservation.id,
        installmentId: installment.id,
      });
      const status = intent.status === 'succeeded' ? 'paid' : 'pending';
      const paidAt = status === 'paid' ? new Date().toISOString() : null;
      db.prepare('UPDATE payments SET stripe_payment_intent_id = ?, status = ?, paid_at = ? WHERE id = ?')
        .run(intent.id, status, paidAt, installment.id);
      console.log(`[run-scheduled-payments] Versement ${installment.id} (${installment.amount} €) → ${status}`);
    } catch (error) {
      const message = error.message || 'Échec du prélèvement';
      db.prepare("UPDATE payments SET status = 'failed', failure_message = ? WHERE id = ?").run(message, installment.id);
      console.error(`[run-scheduled-payments] Échec versement ${installment.id} (réservation ${reservation.id}) : ${message}`);
      // A failed charge here means the client's payment method needs
      // attention (expired card, insufficient funds...) — surfaced to the
      // admin in espace-oa via the payment's 'failed' status, not retried
      // automatically to avoid repeated declined-charge attempts.
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-scheduled-payments] Erreur inattendue', err);
    process.exit(1);
  });

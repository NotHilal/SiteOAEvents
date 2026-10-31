import db from '../../../src/lib/sqlite-db.js';
import { isCardCheckoutConfigured, getAllInstallmentTiers } from '../../../src/lib/stripe.js';

// Public, read-only, booleans only — lets the reservation page know whether
// to show a payment step at all, and which option(s) to offer, without
// exposing the IBAN or any secret. With no configured payment provider,
// the rental form directs clients to contact OA instead of taking an order.
//
// An optional ?reservationId= adds `installmentTiers` (2x/3x/4x eligibility)
// for that specific reservation, based on its event date and total — so the
// client can grey out any tier it doesn't qualify for yet, with an
// explanation, instead of offering a choice create-intent would reject.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'bank_iban'").get();
  const data = {
    card: isCardCheckoutConfigured(),
    virement: !!(row && row.value),
  };

  const { reservationId } = req.query;
  if (reservationId) {
    const reservation = await db.prepare('SELECT dates, date, grand_total FROM reservations WHERE id = ?').get(reservationId);
    if (reservation) {
      const eventDate = (() => {
        try { return (JSON.parse(reservation.dates) || [])[0] || reservation.date; } catch { return reservation.date; }
      })();
      data.installmentTiers = await getAllInstallmentTiers(reservation.grand_total, eventDate);
      const payments = await db.prepare('SELECT method FROM payments WHERE reservation_id = ? ORDER BY installment_index').all(reservationId);
      if (payments.length) data.prepared = { method: payments[0].method, count: payments.length };
    }
  }

  return res.status(200).json({ data });
}

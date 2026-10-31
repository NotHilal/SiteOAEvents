import db from '../../../src/lib/sqlite-db';
import { expireUnpaidOrders } from '../../../src/lib/orders.js';

// Public, PII-free view of active reservations — used by the booking wizard
// (anonymous visitors) to know which days are already booked and how much
// of each material's stock is already committed elsewhere, without exposing
// any customer data. The generic /api/db proxy can't serve this: `reservations`
// GET requires auth there (that table also holds name/email/phone/address),
// and it always returns every column with no way to select a subset — so an
// unauthenticated caller previously got a silent 401 here, meaning the
// wizard's stock-availability check never actually ran for real visitors.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    await expireUnpaidOrders();
    const { before } = req.query;
    let sql = `SELECT date, dates, materials FROM reservations WHERE status IN ('confirmed', 'pending', 'awaiting_payment')`;
    const args = [];
    if (before && /^\d{4}-\d{2}-\d{2}$/.test(before)) {
      sql += ' AND date <= ?';
      args.push(before);
    }

    const rows = await db.prepare(sql).all(...args);
    const data = rows.map(r => {
      let dates = [];
      let materials = [];
      try { dates = JSON.parse(r.dates || '[]'); } catch {}
      try { materials = JSON.parse(r.materials || '[]'); } catch {}
      return { date: r.date, dates, materials };
    });

    return res.status(200).json({ data });
  } catch (error) {
    console.error('[API reservations/public Error]', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

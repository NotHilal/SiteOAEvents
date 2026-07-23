import db from '../../src/lib/sqlite-db.js';

// Public lookup, deliberately requiring BOTH the reference and the email
// used on the request — the reference alone (6 chars, ~1 billion
// combinations) is already hard to guess, but pairing it with the email
// means a stranger can't browse other people's bookings even if they
// happened to guess a valid reference.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, reference } = req.body || {};
  if (!email || !reference) {
    return res.status(400).json({ message: 'Email et numéro de commande requis.' });
  }

  try {
    const resa = await db.prepare(`
      SELECT * FROM reservations
      WHERE lower(email) = lower(?) AND upper(reference) = upper(?)
    `).get(email.trim(), reference.trim());

    if (!resa) {
      // Generic message on purpose — doesn't reveal whether the email or
      // the reference was the part that didn't match.
      return res.status(404).json({ message: 'Aucune demande trouvée avec cet email et ce numéro de commande.' });
    }

    let dates = [];
    let materials = [];
    try { dates = JSON.parse(resa.dates) || []; } catch {}
    try { materials = JSON.parse(resa.materials) || []; } catch {}

    const payments = await db.prepare('SELECT installment_index, installment_label, due_date, amount, status FROM payments WHERE reservation_id = ? ORDER BY installment_index').all(resa.id);
    const fullyPaid = payments.length > 0 && payments.every(p => p.status === 'paid');

    return res.status(200).json({
      data: {
        id: resa.id,
        reference: resa.reference,
        status: resa.status,
        dates: dates.length ? dates : [resa.date],
        event_type: resa.event_type,
        nb_persons: resa.nb_persons,
        materials,
        delivery_address: resa.delivery_address,
        distance_km: resa.distance_km,
        delivery_fee: resa.delivery_fee,
        quote_base_fee: resa.quote_base_fee,
        quote_per_km: resa.quote_per_km,
        materials_total: resa.materials_total,
        grand_total: resa.grand_total,
        payment_method: resa.payment_method,
        created_at: resa.created_at,
        payments,
        fullyPaid,
      },
    });
  } catch (error) {
    console.error('[Track API Error]', error);
    return res.status(500).json({ message: 'Erreur lors de la recherche de votre demande.' });
  }
}

import { getAvailability } from '../../src/lib/stock.js'

// Public: how many units of each material are free over the given dates —
// used by product pages and the catalogue quick view. No customer data.
//   GET /api/availability?ids=12,13&dates=2026-11-07,2026-11-08
export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end() }
  const ids = String(req.query.ids || '').split(',').map(s => s.trim()).filter(id => /^[a-zA-Z0-9_-]{1,80}$/.test(id)).slice(0, 50)
  const dates = String(req.query.dates || '').split(',').map(s => s.trim()).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 31)
  try {
    return res.json({ data: await getAvailability(ids, dates) })
  } catch (error) {
    console.error('[availability]', error)
    return res.status(500).json({ message: 'Disponibilités indisponibles. Réessayez.' })
  }
}

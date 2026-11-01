import db from '../../../src/lib/db/index.js'

// Materials + price tiers for the cart and the checkout.
//   GET /api/catalogue/items?ids=mat-a,mat-b
const COLUMNS = 'id, name, description, category, image_url, gallery, max_quantity, available, slug, product_id, variant_label, variant_order, min_order_qty'

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end() }
  const ids = [...new Set(String(req.query.ids || '').split(',').map(s => s.trim()).filter(id => /^[a-zA-Z0-9_-]{1,80}$/.test(id)))].slice(0, 100)
  if (!ids.length) return res.json({ data: { materials: [], tiers: [] } })
  const marks = ids.map(() => '?').join(',')
  try {
    const [materials, tiers] = await Promise.all([
      db.prepare(`SELECT ${COLUMNS} FROM materials WHERE id IN (${marks})`).all(...ids),
      db.prepare(`SELECT material_id, min_qty, max_qty, price_weekday_ht, price_weekend_ht, sort_order FROM material_price_tiers WHERE material_id IN (${marks}) ORDER BY min_qty`).all(...ids),
    ])
    return res.json({ data: { materials, tiers } })
  } catch (error) {
    console.error('[catalogue/items]', error)
    return res.status(500).json({ message: 'Catalogue indisponible.' })
  }
}

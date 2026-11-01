import db from '../../../src/lib/db/index.js'
import { categoryTitle, sortCategories } from '../../../src/lib/catalogue-pages.js'

// Catalogue categories (navbar strip, /catalogue tiles), in their order.
export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end() }
  try {
    const rows = sortCategories(await db.prepare('SELECT id, name, label, description, image_url, position, created_at FROM categories').all())
    return res.json({ data: rows.map(c => ({ id: c.id, name: c.name, label: categoryTitle(c), description: c.description, image_url: c.image_url, position: c.position })) })
  } catch (error) {
    console.error('[catalogue/categories]', error)
    return res.status(500).json({ message: 'Catalogue indisponible.' })
  }
}

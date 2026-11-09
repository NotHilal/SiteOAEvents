import { getCatalogueCategories } from '../../../src/lib/catalogue-categories.js'

// Catalogue categories (navbar strip, /catalogue tiles), in their order.
export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end() }
  try {
    return res.json({ data: await getCatalogueCategories() })
  } catch (error) {
    console.error('[catalogue/categories]', error)
    return res.status(500).json({ message: 'Catalogue indisponible.' })
  }
}

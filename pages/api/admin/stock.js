import { isAuthorized } from '../../../src/lib/auth.js'
import { adjustStock, getStockOverview } from '../../../src/lib/stock.js'

// Espace OA > Stock. GET: overview; POST { materialId, delta, reason }.
export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return res.status(405).end() }
  if (!isAuthorized(req)) return res.status(401).json({ message: 'Connexion administrateur requise.' })
  try {
    if (req.method === 'GET') return res.json({ data: await getStockOverview() })
    return res.json({ data: await adjustStock(req.body || {}) })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message })
    console.error('[admin/stock]', error)
    return res.status(500).json({ message: 'Stock indisponible. Réessayez dans quelques instants.' })
  }
}

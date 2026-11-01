import { adminRoute } from '../../../src/lib/admin-api.js'
import { CATALOG_ACTIONS, getCatalog } from '../../../src/lib/admin-catalog.js'

// /admin > Matériel, Site > Catalogue.
//   GET                       → { materials, products, tiers, categories }
//   POST { action, ...data }  → one of src/lib/admin-catalog.js CATALOG_ACTIONS
export default adminRoute(['GET', 'POST'], req => {
  if (req.method === 'GET') return getCatalog()
  const { action, ...data } = req.body || {}
  const fn = CATALOG_ACTIONS[action]
  if (!fn) throw Object.assign(new Error('Action inconnue.'), { status: 400 })
  return fn(data)
}, 'admin/catalog')

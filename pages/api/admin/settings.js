import { adminRoute } from '../../../src/lib/admin-api.js'
import { getSettings, removeStripe, saveSettings, saveStripe, testStripe } from '../../../src/lib/admin-site.js'

// /admin > Réglages.
//   GET                                  → settings (Stripe keys masked)
//   PUT  { ...delivery & rentals }       → save
//   POST { action: 'stripe', publishableKey?, secretKey?, webhookSecret? } → test + save keys
//   POST { action: 'stripe-test' } · POST { action: 'stripe-remove' }
export default adminRoute(['GET', 'PUT', 'POST'], req => {
  if (req.method === 'GET') return getSettings()
  if (req.method === 'PUT') return saveSettings(req.body || {})
  const { action, ...data } = req.body || {}
  if (action === 'stripe') return saveStripe(data)
  if (action === 'stripe-test') return testStripe()
  if (action === 'stripe-remove') return removeStripe()
  throw Object.assign(new Error('Action inconnue.'), { status: 400 })
}, 'admin/settings')

import { isAuthorized } from '../../../src/lib/auth.js'
import { cancelOrder } from '../../../src/lib/orders.js'

// /admin > Commandes. POST { id, action: 'cancel', refundPercent: 100 | 50 | 0 }:
// cancels the order and refunds its payment through Stripe (100 % by default).
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end() }
  if (!isAuthorized(req)) return res.status(401).json({ message: 'Connexion administrateur requise.' })
  const { id, action, refundPercent } = req.body || {}
  if (typeof id !== 'string' || action !== 'cancel') return res.status(400).json({ message: 'Requête invalide.' })
  try {
    return res.json({ data: await cancelOrder(id, { refundPercent: refundPercent ?? 100 }) })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message })
    console.error('[admin/orders]', error)
    return res.status(502).json({ message: `Annulation impossible : ${error.message}` })
  }
}

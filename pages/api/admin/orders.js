import { isAuthorized } from '../../../src/lib/auth.js'
import { cancelOrder } from '../../../src/lib/orders.js'

// Espace OA > Commandes. POST { id, action: 'cancel' }: cancels the order
// and refunds its payment in full through Stripe.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end() }
  if (!isAuthorized(req)) return res.status(401).json({ message: 'Connexion administrateur requise.' })
  const { id, action } = req.body || {}
  if (typeof id !== 'string' || action !== 'cancel') return res.status(400).json({ message: 'Requête invalide.' })
  try {
    return res.json({ data: await cancelOrder(id) })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message })
    console.error('[admin/orders]', error)
    return res.status(502).json({ message: `Annulation impossible : ${error.message}` })
  }
}

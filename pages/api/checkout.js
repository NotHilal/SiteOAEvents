import { startCheckout } from '../../src/lib/orders.js'
import { getStripeConfig } from '../../src/lib/stripe.js'
import { isSpam } from '../../src/lib/public-submissions.js'
import { rateLimit } from '../../src/lib/rate-limit.js'
import { getCurrentCustomer } from '../../src/lib/customer-orders.js'

// Checkout page (pages/commande):
//   GET  → { available, publishableKey } — whether online payment is set up.
//   POST → validates the basket, holds the stock, returns the Stripe
//          client secret the payment form confirms (or { paid: true }).
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { secretKey, publishableKey } = await getStripeConfig()
    const available = !!(secretKey && publishableKey)
    return res.json({ data: { available, publishableKey: available ? publishableKey : null } })
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).end() }
  if (!rateLimit(req, res, { key: 'checkout', limit: 20, windowMs: 600000 })) return
  if (isSpam(req.body)) return res.status(400).json({ message: 'Commande refusée.' })
  try {
    const account = await getCurrentCustomer(req)
    return res.json({ data: await startCheckout(req.body || {}, { accountId: account?.id }) })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message })
    console.error('[checkout]', error)
    return res.status(500).json({ message: 'Le paiement est momentanément indisponible. Réessayez dans quelques instants.' })
  }
}

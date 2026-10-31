import { prepareCheckout } from '../../../src/lib/payment-checkout.js'
import { rateLimit } from '../../../src/lib/rate-limit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!rateLimit(req, res, { key: 'payment-checkout', limit: 20, windowMs: 600000 })) return
  try {
    const data = await prepareCheckout(req.body?.reservationId, req.body?.plan, 'card')
    return res.json({ data })
  } catch (error) {
    console.error('[checkout]', error.message)
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Paiement indisponible. Réessayez dans quelques instants.' })
  }
}

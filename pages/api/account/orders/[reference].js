import { getCurrentCustomer, getCustomerOrder } from '../../../../src/lib/customer-orders.js'

// One order of the signed-in customer. An order of another account answers
// 404, same as an unknown reference.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' })
  const account = await getCurrentCustomer(req, res)
  if (!account) return res.status(401).json({ message: 'Session expirée. Reconnectez-vous.' })
  const reference = String(req.query.reference || '')
  if (!/^[A-Za-z0-9-]{1,20}$/.test(reference)) return res.status(404).json({ message: 'Commande introuvable.' })
  try {
    const order = await getCustomerOrder(account.id, reference)
    if (!order) return res.status(404).json({ message: 'Commande introuvable.' })
    return res.status(200).json({ data: order })
  } catch (error) {
    console.error('[account order]', error)
    return res.status(500).json({ message: 'Impossible de charger cette commande.' })
  }
}

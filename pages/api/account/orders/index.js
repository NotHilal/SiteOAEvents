import { getCurrentCustomer, listCustomerOrders } from '../../../../src/lib/customer-orders.js'

// Mon compte > Mes commandes — the signed-in customer's orders, newest first.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' })
  const account = await getCurrentCustomer(req, res)
  if (!account) return res.status(401).json({ message: 'Session expirée. Reconnectez-vous.' })
  try {
    return res.status(200).json({ data: await listCustomerOrders(account.id) })
  } catch (error) {
    console.error('[account orders]', error)
    return res.status(500).json({ message: 'Impossible de charger vos commandes.' })
  }
}

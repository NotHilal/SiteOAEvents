import db from '../../../src/lib/sqlite-db.js'
import { clearCustomerCookie, getCustomerSession, publicCustomer, isCurrentCustomerSession } from '../../../src/lib/customer-auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' })
  const session = getCustomerSession(req)
  if (!session) return res.status(401).json({ user: null })
  const account = await db.prepare('SELECT * FROM customer_accounts WHERE id = ?').get(session.sub)
  if (!isCurrentCustomerSession(session, account)) {
    clearCustomerCookie(res)
    return res.status(401).json({ user: null })
  }
  return res.status(200).json({ user: publicCustomer(account) })
}

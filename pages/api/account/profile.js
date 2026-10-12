import db from '../../../src/lib/sqlite-db.js'
import { getCustomerSession, publicCustomer } from '../../../src/lib/customer-auth.js'

const clean = (value, max = 120) => String(value || '').trim().slice(0, max)

export default async function handler(req, res) {
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).json({ message: 'Method Not Allowed' })
  const session = getCustomerSession(req)
  if (!session) return res.status(401).json({ message: 'Session expirée.' })
  const account = await db.prepare('SELECT * FROM customer_accounts WHERE id = ? AND active = 1').get(session.sub)
  if (!account) return res.status(401).json({ message: 'Compte introuvable.' })

  if (req.method === 'GET') return res.status(200).json({ user: publicCustomer(account) })

  const firstName = clean(req.body?.firstName, 80)
  const lastName = clean(req.body?.lastName, 80)
  const phone = clean(req.body?.phone, 40)
  const accountType = req.body?.accountType === 'professionnel' ? 'professionnel' : 'particulier'
  const companyName = accountType === 'professionnel' ? clean(req.body?.companyName, 140) : ''
  if (!firstName || !lastName) return res.status(400).json({ message: 'Le prénom et le nom sont requis.' })
  if (accountType === 'professionnel' && !companyName) return res.status(400).json({ message: "Le nom de l’entreprise est requis." })

  const now = new Date().toISOString()
  await db.prepare(`
    UPDATE customer_accounts SET first_name = ?, last_name = ?, phone = ?, account_type = ?, company_name = ?, updated_at = ?
    WHERE id = ?
  `).run(firstName, lastName, phone || null, accountType, companyName || null, now, account.id)
  const updated = await db.prepare('SELECT * FROM customer_accounts WHERE id = ?').get(account.id)
  return res.status(200).json({ user: publicCustomer(updated) })
}

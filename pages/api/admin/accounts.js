import db from '../../../src/lib/sqlite-db.js'
import { isAuthorized } from '../../../src/lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' })
  if (!isAuthorized(req)) return res.status(401).json({ message: 'Non autorisé.' })
  try {
    const accounts = await db.prepare(`
      SELECT id, email, first_name, last_name, phone, civility, account_type, company_name,
             active, last_login_at, created_at, updated_at
      FROM customer_accounts
      ORDER BY created_at DESC
    `).all()
    return res.status(200).json({ accounts })
  } catch (error) {
    console.error('[Admin accounts]', error)
    return res.status(500).json({ message: 'Impossible de charger les comptes.' })
  }
}

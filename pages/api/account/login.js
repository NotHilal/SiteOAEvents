import db from '../../../src/lib/sqlite-db.js'
import { createCustomerToken, publicCustomer, setCustomerCookie, verifyCustomerPassword } from '../../../src/lib/customer-auth.js'
import { rateLimit } from '../../../src/lib/rate-limit.js'
import { tryCustomerWelcome } from '../../../src/lib/customer-welcome.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' })
  if (!rateLimit(req, res, { key: 'customer-login', limit: 8, windowMs: 15 * 60 * 1000 })) return

  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 254)
  const password = String(req.body?.password || '')
  try {
    const account = await db.prepare('SELECT * FROM customer_accounts WHERE email = ? COLLATE NOCASE').get(email)
    if (!account || !account.active || !verifyCustomerPassword(password, account.password_hash)) {
      return res.status(400).json({ message: 'Adresse email ou mot de passe incorrect.' })
    }
    const now = new Date().toISOString()
    await db.prepare('UPDATE customer_accounts SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, account.id)
    setCustomerCookie(res, createCustomerToken(account))
    await tryCustomerWelcome(account.id)
    return res.status(200).json({ user: publicCustomer({ ...account, last_login_at: now }) })
  } catch (error) {
    console.error('[Customer login]', error)
    return res.status(500).json({ message: 'Connexion momentanément indisponible.' })
  }
}

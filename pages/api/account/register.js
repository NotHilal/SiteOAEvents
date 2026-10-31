import crypto from 'crypto'
import db from '../../../src/lib/sqlite-db.js'
import { createCustomerToken, hashCustomerPassword, publicCustomer, setCustomerCookie, customerPasswordError } from '../../../src/lib/customer-auth.js'
import { rateLimit } from '../../../src/lib/rate-limit.js'
import { normalizeFrenchPhone } from '../../../src/lib/french-phone.js'
import { tryCustomerWelcome } from '../../../src/lib/customer-welcome.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const clean = (value, max = 120) => String(value || '').trim().slice(0, max)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' })
  if (!rateLimit(req, res, { key: 'customer-register', limit: 6, windowMs: 60 * 60 * 1000 })) return

  const email = clean(req.body?.email, 254).toLowerCase()
  const password = String(req.body?.password || '')
  const firstName = clean(req.body?.firstName, 80)
  const lastName = clean(req.body?.lastName, 80)
  const phone = normalizeFrenchPhone(req.body?.phone)
  const civility = ['monsieur', 'madame', 'mx'].includes(req.body?.civility) ? req.body.civility : ''
  const accountType = req.body?.accountType === 'professionnel' ? 'professionnel' : 'particulier'
  const companyName = accountType === 'professionnel' ? clean(req.body?.companyName, 140) : ''

  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Adresse email invalide.' })
  if (!firstName || !lastName) return res.status(400).json({ message: 'Le prénom et le nom sont requis.' })
  if (!phone) return res.status(400).json({ message: 'Saisissez un numéro français valide au format +33 6 12 34 56 78.' })
  const passwordError = customerPasswordError(password)
  if (passwordError) return res.status(400).json({ message: passwordError })
  if (accountType === 'professionnel' && !companyName) return res.status(400).json({ message: "Le nom de l’entreprise est requis." })

  try {
    const existing = await db.prepare('SELECT id FROM customer_accounts WHERE email = ? COLLATE NOCASE').get(email)
    if (existing) return res.status(409).json({ message: 'Un compte existe déjà avec cette adresse email.' })

    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const sessionToken = createCustomerToken({ id, email, session_version: 0 })
    const passwordHash = hashCustomerPassword(password)
    await db.writeTransaction(async tx => {
      await tx.prepare(`
        INSERT INTO customer_accounts
          (id, email, password_hash, first_name, last_name, phone, civility, account_type, company_name, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(id, email, passwordHash, firstName, lastName, phone || null, civility || null, accountType, companyName || null, now, now)
      await tx.prepare('INSERT INTO customer_welcome_emails (account_id, created_at) VALUES (?, ?)').run(id, now)
    })

    const account = await db.prepare('SELECT * FROM customer_accounts WHERE id = ?').get(id)
    setCustomerCookie(res, sessionToken)
    await tryCustomerWelcome(id)
    return res.status(201).json({ user: publicCustomer(account) })
  } catch (error) {
    if (String(error.code).startsWith('SQLITE_CONSTRAINT') && String(error.message).includes('customer_accounts.email')) return res.status(409).json({ message: 'Un compte existe déjà avec cette adresse email.' })
    if (/SQLITE_BUSY|SQLITE_LOCKED/.test(String(error.code))) return res.status(409).json({ message: 'Une inscription est en cours. Réessayez dans quelques instants.' })
    console.error('[Customer register] registration failed')
    return res.status(500).json({ message: 'Impossible de créer le compte pour le moment.' })
  }
}

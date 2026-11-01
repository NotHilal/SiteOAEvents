import crypto from 'node:crypto'
import db from '../../src/lib/db/index.js'
import { isSpam, sanitizeContact } from '../../src/lib/public-submissions.js'
import { rateLimit } from '../../src/lib/rate-limit.js'

// Contact form (pages/contact.jsx) → contacts table, read in /admin > Clients > Messages.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end() }
  if (!rateLimit(req, res, { key: 'contact', limit: 6, windowMs: 10 * 60 * 1000 })) return
  const body = req.body || {}
  // Honeypot: pretend success so bots don't adapt.
  if (isSpam(body)) return res.json({ data: { ok: true } })
  const { record, error } = await sanitizeContact(body)
  if (error) return res.status(400).json({ message: error })
  try {
    await db.prepare('INSERT INTO contacts (id, prenom, nom, email, telephone, type_evenement, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, false, ?)')
      .run(crypto.randomUUID(), record.prenom, record.nom, record.email, record.telephone, record.type_evenement, record.message, new Date().toISOString())
    return res.json({ data: { ok: true } })
  } catch (err) {
    console.error('[contact]', err)
    return res.status(500).json({ message: 'Envoi impossible pour le moment.' })
  }
}

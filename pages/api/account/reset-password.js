import { rateLimit } from '../../../src/lib/rate-limit.js'
import { clearCustomerCookie } from '../../../src/lib/customer-auth.js'
import { resetCustomerPassword } from '../../../src/lib/password-reset.js'

export const config = { api: { bodyParser: { sizeLimit: '2kb' } } }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end() }
  if (!rateLimit(req, res, { key: 'customer-reset-password', limit: 10, windowMs: 15 * 60000 })) return
  try {
    await resetCustomerPassword(req.body || {})
    clearCustomerCookie(res)
    return res.json({ message: 'Votre mot de passe a été modifié. Connectez-vous avec votre nouveau mot de passe.' })
  } catch (error) {
    return res.status(error.status || 503).json({ message: error.status ? error.message : 'Réinitialisation indisponible. Réessayez dans quelques instants.' })
  }
}

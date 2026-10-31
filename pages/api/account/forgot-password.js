import { rateLimit } from '../../../src/lib/rate-limit.js'
import { isValidEmail } from '../../../src/lib/public-submissions.js'
import { requestPasswordReset, RESET_MESSAGE } from '../../../src/lib/password-reset.js'

export const config = { api: { bodyParser: { sizeLimit: '2kb' } } }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end() }
  if (!rateLimit(req, res, { key: 'customer-forgot-password', limit: 5, windowMs: 15 * 60000 })) return
  const started = Date.now()
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  if (!isValidEmail(email)) return res.status(400).json({ message: 'Saisissez une adresse email valide.' })
  let status = 200
  let message = RESET_MESSAGE
  try { await requestPasswordReset(email) }
  catch (error) {
    if (error.status === 503) { status = 503; message = error.message }
    // No account-specific failure or information is returned or logged.
  }
  // The email provider has a 2s timeout; known and unknown addresses receive
  // the same message after the same minimum duration, including on mail failure.
  await new Promise(resolve => setTimeout(resolve, Math.max(0, 2500 - (Date.now() - started))))
  return res.status(status).json({ message })
}

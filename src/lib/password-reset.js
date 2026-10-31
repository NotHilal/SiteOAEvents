import crypto from 'node:crypto'
import db from './sqlite-db.js'
import { createPasswordResetToken, customerPasswordError, hashCustomerPassword } from './customer-auth.js'
import { isEmailConfigured, sendEmail, passwordResetEmail, passwordChangedEmail } from './email.js'

export const RESET_MESSAGE = 'Si un compte actif correspond à cette adresse, vous recevrez un lien pour choisir un nouveau mot de passe. Le lien est valable 30 minutes.'
const invalidLink = () => Object.assign(new Error('Ce lien est invalide, a expiré ou a déjà été utilisé. Demandez un nouveau lien.'), { status: 400 })
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex')

export function passwordResetOrigin() {
  let url
  try { url = new URL(process.env.PASSWORD_RESET_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || '') } catch {}
  const local = url && ['localhost', '127.0.0.1'].includes(url.hostname)
  if (!url || url.username || url.password || (!local && url.protocol !== 'https:') || (local && url.protocol !== 'http:' && url.protocol !== 'https:') || /(^|\.)(exemple\.fr|example\.com|example\.org|example\.net)$/.test(url.hostname)) {
    throw Object.assign(new Error('La réinitialisation est momentanément indisponible. Contactez-nous.'), { status: 503 })
  }
  return url.origin
}

export async function dispatchPasswordResetEmails(requestId) {
  if (!isEmailConfigured()) return
  const row = await db.prepare(`SELECT r.*, a.email, a.first_name, a.active, a.session_version AS current_version
    FROM customer_password_resets r JOIN customer_accounts a ON a.id = r.account_id WHERE r.id = ?`).get(requestId)
  if (!row?.active) return
  const current = row.session_version === row.current_version
  const resetMail = !row.used_at && current && row.expires_at > new Date().toISOString() && !row.sent_at
  const changedMail = row.used_at && row.session_version + 1 === row.current_version && !row.changed_notice_sent_at
  if (!resetMail && !changedMail) return
  const token = resetMail ? createPasswordResetToken(row.id) : null
  if (resetMail && hashToken(token) !== row.token_hash) return
  const content = resetMail
    ? passwordResetEmail({ name: row.first_name, resetUrl: `${passwordResetOrigin()}/mon-compte/reinitialiser-mot-de-passe#token=${token}` })
    : passwordChangedEmail({ name: row.first_name })
  try {
    const result = await sendEmail({ to: row.email, ...content, idempotencyKey: `customer-reset:${row.id}:${resetMail ? 'link' : 'changed'}`, timeoutMs: 2000 })
    if (result?.skipped) return
    await db.prepare(`UPDATE customer_password_resets SET ${resetMail ? 'sent_at' : 'changed_notice_sent_at'} = ?, last_error = NULL WHERE id = ?`).run(new Date().toISOString(), row.id)
  } catch {
    // Never log/store the reset URL, token, password or provider response body.
    await db.prepare("UPDATE customer_password_resets SET last_error = 'email_delivery_failed' WHERE id = ?").run(row.id)
  }
}

export async function requestPasswordReset(email) {
  passwordResetOrigin() // Validate configured origin, never trust request Host.
  const id = crypto.randomUUID()
  const tokenHash = hashToken(createPasswordResetToken(id))
  const now = new Date().toISOString()
  const requestId = await db.writeTransaction(async tx => {
    const account = await tx.prepare('SELECT id, session_version FROM customer_accounts WHERE email = ? COLLATE NOCASE AND active = 1').get(email)
    if (!account) return null
    const recent = await tx.prepare('SELECT id FROM customer_password_resets WHERE account_id = ? AND created_at > ?').all(account.id, new Date(Date.now() - 3600000).toISOString())
    const cooldown = await tx.prepare('SELECT id FROM customer_password_resets WHERE account_id = ? AND created_at > ?').get(account.id, new Date(Date.now() - 60000).toISOString())
    if (recent.length >= 3 || cooldown) return null
    await tx.prepare(`INSERT INTO customer_password_resets (id, account_id, token_hash, session_version, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`).run(id, account.id, tokenHash, account.session_version, new Date(Date.now() + 30 * 60000).toISOString(), now)
    return id
  })
  if (requestId) await dispatchPasswordResetEmails(requestId)
  return RESET_MESSAGE
}

export async function resetCustomerPassword({ token, password, confirmation }) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw invalidLink()
  const error = customerPasswordError(password)
  if (error || password !== confirmation) throw Object.assign(new Error(error || 'Les deux mots de passe doivent être identiques.'), { status: 400 })
  const passwordHash = hashCustomerPassword(password)
  const changedRequest = await db.writeTransaction(async tx => {
    const row = await tx.prepare(`SELECT r.*, a.active, a.session_version AS current_version FROM customer_password_resets r
      JOIN customer_accounts a ON a.id = r.account_id WHERE r.token_hash = ?`).get(hashToken(token))
    const now = new Date().toISOString()
    if (!row?.active || row.used_at || row.expires_at <= now || row.session_version !== row.current_version) throw invalidLink()
    await tx.prepare('UPDATE customer_accounts SET password_hash = ?, session_version = session_version + 1, updated_at = ? WHERE id = ?').run(passwordHash, now, row.account_id)
    // Consume this request and expire the other links in the same transaction.
    await tx.prepare('UPDATE customer_password_resets SET used_at = ? WHERE id = ?').run(now, row.id)
    await tx.prepare('UPDATE customer_password_resets SET expires_at = ? WHERE account_id = ? AND id != ? AND used_at IS NULL').run(now, row.account_id, row.id)
    return row.id
  })
  // A notification outage must not report failure after the password commit.
  try { await dispatchPasswordResetEmails(changedRequest) } catch { console.error('[password-reset] notification deferred') }
}

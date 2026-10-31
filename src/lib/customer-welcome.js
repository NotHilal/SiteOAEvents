import db from './sqlite-db.js'
import { customerWelcomeEmail, isEmailConfigured, sendEmail } from './email.js'
import { passwordResetOrigin } from './password-reset.js'

// Metadata is inserted with the account. Delivery can fail without rolling
// back signup; a later login retries the same event and provider key.
export async function dispatchCustomerWelcome(accountId) {
  if (!isEmailConfigured()) return
  const row = await db.prepare(`SELECT w.*, a.email, a.first_name, a.active
    FROM customer_welcome_emails w JOIN customer_accounts a ON a.id = w.account_id
    WHERE w.account_id = ?`).get(accountId)
  if (!row || row.sent_at || !row.active) return
  let origin
  try {
    // Share the strict trusted-origin rules with recovery emails. No Host
    // header or example-domain link is accepted for a customer email.
    origin = passwordResetOrigin()
  } catch {
    await db.prepare("UPDATE customer_welcome_emails SET last_error = 'email_configuration_incomplete' WHERE account_id = ?").run(accountId)
    return
  }
  try {
    const content = customerWelcomeEmail({ name: row.first_name, accountUrl: `${origin}/mon-compte`, trackingUrl: `${origin}/suivi` })
    const result = await sendEmail({ to: row.email, ...content, idempotencyKey: `customer-welcome:${row.account_id}`, timeoutMs: 2000 })
    if (result?.skipped) return
    await db.prepare('UPDATE customer_welcome_emails SET sent_at = ?, last_error = NULL WHERE account_id = ?').run(new Date().toISOString(), accountId)
  } catch {
    await db.prepare("UPDATE customer_welcome_emails SET last_error = 'email_delivery_failed' WHERE account_id = ?").run(accountId)
  }
}

export async function tryCustomerWelcome(accountId) {
  try { await dispatchCustomerWelcome(accountId) }
  catch { console.error('[customer-welcome] delivery deferred') }
}

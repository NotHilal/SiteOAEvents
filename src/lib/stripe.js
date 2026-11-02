import crypto from 'node:crypto'
import Stripe from 'stripe'
import db from './db/index.js'

// Stripe keys of the business, entered in /admin > Réglages and stored in
// the settings table — the secret key and the webhook secret encrypted
// (AES-256-GCM, key from SETTINGS_ENCRYPTION_KEY, else JWT_SECRET). Env vars
// (STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
// STRIPE_WEBHOOK_SECRET) still work as a fallback.

const KEYS = { publishableKey: 'stripe_publishable_key', secretKey: 'stripe_secret_key', webhookSecret: 'stripe_webhook_secret' }
const SECRET_FIELDS = new Set(['secretKey', 'webhookSecret'])

function encryptionKey() {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET
  if (!raw || raw.length < 32) {
    if (process.env.NODE_ENV === 'production') throw new Error('SETTINGS_ENCRYPTION_KEY (ou JWT_SECRET) manquant : impossible de chiffrer les clés Stripe.')
    return crypto.createHash('sha256').update('oa-dev-only-settings-key').digest()
  }
  return crypto.createHash('sha256').update(raw).digest()
}

export function encryptSecret(plain) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  return `enc:v1:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')}`
}

export function decryptSecret(value) {
  if (!value?.startsWith('enc:v1:')) return value || ''
  try {
    const buf = Buffer.from(value.slice(7), 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), buf.subarray(0, 12))
    decipher.setAuthTag(buf.subarray(12, 28))
    return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8')
  } catch {
    console.error('[stripe] clé enregistrée illisible (clé de chiffrement modifiée ?) — ressaisissez les clés dans Réglages.')
    return ''
  }
}

let cache = null // { at, config }
const TTL = 30_000

export async function getStripeConfig() {
  if (cache && Date.now() - cache.at < TTL) return cache.config
  const rows = await db.prepare(`SELECT key, value FROM settings WHERE key IN (${Object.values(KEYS).map(() => '?').join(',')})`).all(...Object.values(KEYS))
  const stored = Object.fromEntries(rows.map(r => [r.key, r.value]))
  const config = {}
  for (const [field, key] of Object.entries(KEYS)) {
    const value = SECRET_FIELDS.has(field) ? decryptSecret(stored[key]) : stored[key]
    config[field] = value || ''
  }
  const fromAdmin = !!config.secretKey
  config.secretKey ||= process.env.STRIPE_SECRET_KEY || ''
  config.publishableKey ||= process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
  config.webhookSecret ||= process.env.STRIPE_WEBHOOK_SECRET || ''
  config.source = fromAdmin ? 'admin' : config.secretKey ? 'env' : null
  config.live = config.secretKey.startsWith('sk_live_') || config.secretKey.startsWith('rk_live_')
  cache = { at: Date.now(), config }
  return config
}

export function clearStripeConfigCache() { cache = null }

// Saves keys from Réglages. Empty / undefined fields are left unchanged;
// `null` removes a stored key.
export async function saveStripeConfig(input) {
  const now = new Date().toISOString()
  for (const [field, key] of Object.entries(KEYS)) {
    const value = input[field]
    if (value === undefined || value === '') continue
    if (value === null) { await db.prepare('DELETE FROM settings WHERE key = ?').run(key); continue }
    const stored = SECRET_FIELDS.has(field) ? encryptSecret(value.trim()) : value.trim()
    await db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').run(key, stored, now)
  }
  clearStripeConfigCache()
}

let instance = null // { key, stripe }
export async function getStripe() {
  const { secretKey } = await getStripeConfig()
  if (!secretKey) throw new Error('Paiement en ligne non configuré : renseignez les clés Stripe dans Espace OA > Réglages.')
  if (instance?.key !== secretKey) instance = { key: secretKey, stripe: new Stripe(secretKey, { apiVersion: '2024-06-20', timeout: 10000, maxNetworkRetries: 2 }) }
  return instance.stripe
}

export async function isStripeConfigured() {
  return !!(await getStripeConfig()).secretKey
}

// Online ordering needs both keys. The webhook secret is strongly
// recommended (it confirms payments even if the customer closes the tab),
// but the return page also confirms them, so checkout works without it.
export async function isCheckoutConfigured() {
  const c = await getStripeConfig()
  return !!(c.secretKey && c.publishableKey)
}

/**
 * One PaymentIntent per order, for the full amount. `automatic_payment_methods`
 * lets the Payment Element offer every method switched on in the Stripe
 * dashboard (Paramètres > Moyens de paiement): card, Apple Pay, Google Pay,
 * PayPal… — adding one there needs no code change. The idempotency key ties
 * it to the order, so a retried checkout never charges twice.
 */
export async function createOrderPaymentIntent(order) {
  return (await getStripe()).paymentIntents.create({
    amount: Math.round(order.grand_total * 100),
    currency: 'eur',
    automatic_payment_methods: { enabled: true },
    receipt_email: order.email,
    description: `Commande ${order.reference} — OA Événementiel`,
    metadata: { reservation_id: order.id, reference: order.reference },
  }, { idempotencyKey: `order-payment:${order.id}` })
}

// Refund of an order's payment, full or partial (Annuler et rembourser).
export async function refundOrderPayment(paymentIntentId, reservationId, amount) {
  const cents = Math.round(amount * 100)
  return (await getStripe()).refunds.create({
    payment_intent: paymentIntentId,
    amount: cents,
    metadata: { reservation_id: reservationId },
  }, { idempotencyKey: `order-refund:${reservationId}:${cents}` })
}

// Réglages > « Tester » : checks the keys against Stripe without charging anything.
export async function testStripeKeys({ secretKey, publishableKey }) {
  const problems = []
  if (publishableKey && !/^pk_(test|live)_/.test(publishableKey)) problems.push('La clé publique doit commencer par pk_test_ ou pk_live_.')
  if (secretKey && !/^(sk|rk)_(test|live)_/.test(secretKey)) problems.push('La clé secrète doit commencer par sk_test_ ou sk_live_.')
  if (secretKey && publishableKey && secretKey.includes('_live_') !== publishableKey.includes('_live_')) problems.push('Les deux clés doivent être du même mode (test ou réel).')
  if (problems.length) return { ok: false, problems }
  try {
    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20', timeout: 10000 })
    const account = await stripe.accounts.retrieve()
    return {
      ok: true,
      live: secretKey.includes('_live_'),
      account: { name: account.settings?.dashboard?.display_name || account.business_profile?.name || account.email || account.id, chargesEnabled: account.charges_enabled, country: account.country },
    }
  } catch (error) {
    return { ok: false, problems: [error?.type === 'StripeAuthenticationError' ? 'Clé secrète refusée par Stripe.' : `Stripe injoignable : ${error.message}`] }
  }
}

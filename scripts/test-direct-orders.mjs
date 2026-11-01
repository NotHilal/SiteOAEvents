// Business/integration tests of the checkout (src/lib/orders.js, the Stripe
// webhook and the admin cancel endpoint). Temporary database, fake Stripe,
// fake geocoding and email — no network call. Run: node scripts/test-direct-orders.mjs
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { spawnSync } from 'node:child_process'

if (!process.argv.includes('--worker')) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'oa-orders-'))
  const result = spawnSync(process.execPath, [process.argv[1], '--worker'], { env: { ...process.env, OA_TEST_DIRECTORY: directory }, stdio: 'inherit' })
  if (!path.resolve(directory).startsWith(path.join(os.tmpdir(), 'oa-orders-'))) throw new Error('Unsafe test directory')
  await fs.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  process.exit(result.status ?? 1)
}
const directory = process.env.OA_TEST_DIRECTORY
process.env.TURSO_DATABASE_URL = `file:${path.join(directory, 'test.sqlite').replaceAll('\\', '/')}`
process.env.TURSO_AUTH_TOKEN = ''
process.env.STRIPE_SECRET_KEY = 'sk_test_local_fake_provider'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local_test'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_local_fake_provider'
process.env.RESEND_API_KEY = 'local_fake_provider'
process.env.ADMIN_EMAIL = 'admin@example.test'
process.env.ADMIN_PASSWORD = 'local-test-password'
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex')
process.env.NOTIFICATION_EMAIL = 'notifications@example.test'
process.env.EMAIL_FROM = 'OA Événementiel <contact@oa-evenementiel.fr>'
const delivered = new Map()
let geoFails = false
let mailFails = false
globalThis.fetch = async (url, options = {}) => {
  if (String(url).startsWith('https://nominatim.openstreetmap.org/')) return Response.json(geoFails ? [] : [{ lat: '48.8', lon: '2.3' }])
  if (String(url).startsWith('https://router.project-osrm.org/')) return Response.json({ code: 'Ok', routes: [{ distance: 10000, duration: 900 }] })
  if (String(url) === 'https://api.resend.com/emails') {
    if (mailFails) return Response.json({ message: 'temporary' }, { status: 503 })
    delivered.set(options.headers['Idempotency-Key'], JSON.parse(options.body))
    return Response.json({ id: 'mail_test' })
  }
  throw new Error(`Unexpected network call: ${url}`)
}
const { default: db } = await import('../src/lib/sqlite-db.js')
const { startCheckout, expireUnpaidOrders, cancelOrder, flushOrderEmails, syncOrderPayment } = await import('../src/lib/orders.js')
const { getStripe } = await import('../src/lib/stripe.js')
const { default: webhook } = await import('../pages/api/payments/webhook.js')
const { default: adminOrders } = await import('../pages/api/admin/orders.js')
const { createAdminToken } = await import('../src/lib/auth.js')

// ---- Fake Stripe ----
const stripe = getStripe()
const intents = new Map()
const idempotent = new Map()
const refunds = []
stripe.paymentIntents.create = async (args, options) => {
  const key = options.idempotencyKey
  if (idempotent.has(key)) return intents.get(idempotent.get(key))
  const id = `pi_${crypto.randomUUID().replaceAll('-', '')}`
  const intent = { ...args, id, status: 'requires_payment_method', client_secret: `${id}_secret_test`, amount_received: 0 }
  intents.set(id, intent); idempotent.set(key, id)
  return intent
}
stripe.paymentIntents.retrieve = async id => structuredClone(intents.get(id))
stripe.paymentIntents.cancel = async id => {
  const intent = intents.get(id)
  if (intent.status === 'processing' || intent.status === 'succeeded') throw new Error('Cannot cancel')
  intent.status = 'canceled'; return intent
}
stripe.refunds.create = async (args, options) => {
  const existing = refunds.find(r => r.key === options.idempotencyKey)
  if (existing) return existing
  const refund = { id: `re_${refunds.length}`, status: 'succeeded', key: options.idempotencyKey, ...args }
  refunds.push(refund); return refund
}
const pay = id => { const intent = intents.get(id); intent.status = 'succeeded'; intent.amount_received = intent.amount; return intent }

async function emit(event, validSignature = true) {
  const raw = JSON.stringify({ id: crypto.randomUUID(), ...event })
  const req = new PassThrough()
  req.method = 'POST'; req.headers = { 'stripe-signature': validSignature ? stripe.webhooks.generateTestHeaderString({ payload: raw, secret: process.env.STRIPE_WEBHOOK_SECRET }) : 'bad' }
  const res = { statusCode: 200, status(n) { this.statusCode = n; return this }, json(body) { this.body = body; return this } }
  const pending = webhook(req, res); req.end(raw); await pending
  return res
}
async function call(handler, { method = 'POST', body, query = {}, admin = false }) {
  const req = { method, body, query, headers: admin ? { authorization: `Bearer ${createAdminToken(process.env.ADMIN_EMAIL)}` } : {}, socket: { remoteAddress: '127.0.0.1' } }
  const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v }, status(n) { this.statusCode = n; return this }, json(body) { this.body = body; return this }, end() { return this } }
  await handler(req, res)
  return res
}

let nextDate = 0
function input(extra = {}) {
  const date = new Date(Date.now() + (60 + nextDate++) * 86400000).toISOString().slice(0, 10)
  return { checkout_key: crypto.randomUUID(), prenom: 'Test', nom: 'Client', phone: '0600000000', email: 'client@example.test', dates: [date], date, materials: [{ id: 'qa-material', quantity: 1 }], delivery_address: 'Adresse fictive de test', grand_total: 39, ...extra }
}
const order = async reference => db.prepare('SELECT * FROM reservations WHERE reference = ?').get(reference)
const paymentOf = async id => db.prepare('SELECT * FROM payments WHERE reservation_id = ?').get(id)
const expire = async id => db.prepare('UPDATE reservations SET expires_at = ? WHERE id = ?').run('2000-01-01T00:00:00.000Z', id)

try {
  await db.prepare('SELECT 1').get()
  await db.prepare("INSERT INTO materials (id, name, max_quantity, available) VALUES ('qa-material', 'Article test', 1, 1)").run()
  await db.prepare("INSERT INTO material_price_tiers (id, material_id, min_qty, price_weekday_ht, price_weekend_ht) VALUES ('qa-tier', 'qa-material', 1, 10, 10)").run()
  await db.prepare("UPDATE settings SET value = '15' WHERE key = 'delivery_base_fee'").run()
  await db.prepare("UPDATE settings SET value = '1.2' WHERE key = 'delivery_per_km'").run()
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM settings WHERE key LIKE 'bank_%' OR key LIKE 'installment_%'").get()).n, 0, 'bank transfer / installment settings are gone')

  // Checkout: order + one PaymentIntent for the full amount, stock held.
  const request = input()
  const first = await startCheckout(request)
  assert.ok(first.clientSecret && first.paymentIntentId && !first.paid)
  const created = await order(first.reference)
  assert.equal(created.status, 'awaiting_payment')
  assert.equal(created.grand_total, 39)
  assert.equal(intents.get(first.paymentIntentId).amount, 3900)
  assert.deepEqual(intents.get(first.paymentIntentId).automatic_payment_methods, { enabled: true }, 'every method enabled in Stripe (card, PayPal…) is offered')
  assert.equal(delivered.size, 0, 'no email before payment')
  assert.equal((await startCheckout(request)).paymentIntentId, first.paymentIntentId, 'retrying the same basket reuses the order and payment')
  assert.equal(intents.size, 1)
  await assert.rejects(startCheckout({ ...request, materials: [{ id: 'qa-material', quantity: 2 }] }), /changé/)
  await assert.rejects(startCheckout(input({ dates: request.dates })), /Stock insuffisant/)

  // Validation
  for (const bad of [input({ materials: [{ id: 'missing', quantity: 1 }] }), input({ materials: [{ id: 'qa-material', quantity: 1.5 }] }), input({ grand_total: 0 }), input({ dates: ['2026-02-30'] }), input({ materials: [] }), input({ prenom: '' })]) await assert.rejects(startCheckout(bad))
  const blocked = input()
  await db.prepare('INSERT INTO blocked_dates (id, date) VALUES (?, ?)').run(crypto.randomUUID(), blocked.dates[0])
  await assert.rejects(startCheckout(blocked), /plus disponible/)
  const partial = input()
  await db.prepare('INSERT INTO blocked_hours (id, date, hour) VALUES (?, ?, ?)').run(crypto.randomUUID(), partial.dates[0], '09:00')
  await assert.rejects(startCheckout(partial), /plus disponible/, 'a partly blocked day cannot be booked for the full day')
  geoFails = true
  await assert.rejects(startCheckout(input()), /livraison/)
  geoFails = false
  delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  await assert.rejects(startCheckout(input()), /indisponible/)
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_local_fake_provider'

  // Concurrency: one unit can't be sold twice.
  const concurrent = input()
  const competing = await Promise.allSettled([startCheckout(concurrent), startCheckout({ ...concurrent, checkout_key: crypto.randomUUID() })])
  assert.equal(competing.filter(r => r.status === 'fulfilled').length, 1)

  // Webhook: signature, amount check, confirmation, idempotency.
  const intent = pay(first.paymentIntentId)
  const event = { type: 'payment_intent.succeeded', data: { object: intent } }
  assert.equal((await emit(event, false)).statusCode, 400)
  assert.equal((await order(first.reference)).status, 'awaiting_payment')
  assert.equal((await emit({ ...event, data: { object: { ...intent, amount_received: 1 } } })).statusCode, 400)
  assert.equal((await emit(event)).statusCode, 200)
  assert.equal((await order(first.reference)).status, 'confirmed', 'paid = confirmed, no admin validation')
  assert.equal(delivered.size, 2)
  assert.ok([...delivered.values()].some(mail => mail.to === 'client@example.test' && /confirmée/.test(mail.subject)))
  assert.ok([...delivered.values()].some(mail => mail.to === 'notifications@example.test'))
  assert.equal((await emit(event)).statusCode, 200)
  assert.equal(delivered.size, 2, 'duplicate webhook sends nothing twice')
  await emit({ type: 'payment_intent.payment_failed', data: { object: { ...intent, last_payment_error: { message: 'old failure' } } } })
  assert.equal((await paymentOf(created.id)).status, 'paid', 'an old failure event cannot undo a payment')
  const again = await startCheckout(request)
  assert.equal(again.paid, true, 'clicking pay again after success goes to the confirmation')

  // Return page path: confirmed without the webhook.
  const noHook = await startCheckout(input())
  pay(noHook.paymentIntentId)
  await syncOrderPayment((await order(noHook.reference)).id)
  assert.equal((await order(noHook.reference)).status, 'confirmed')

  // Abandoned / failed payments release the stock, cancel the intent.
  const abandoned = await startCheckout(input())
  const abandonedId = (await order(abandoned.reference)).id
  await expire(abandonedId); await expireUnpaidOrders(abandonedId)
  assert.equal((await order(abandoned.reference)).status, 'expired')
  assert.equal(intents.get(abandoned.paymentIntentId).status, 'canceled')
  await assert.rejects(startCheckout({ ...input(), checkout_key: abandoned.reference }), /checkout|Actualisez/i)
  const late = await startCheckout(input())
  const lateId = (await order(late.reference)).id
  pay(late.paymentIntentId)
  await expire(lateId); await expireUnpaidOrders(lateId)
  assert.equal((await order(late.reference)).status, 'confirmed', 'a payment that succeeded before expiry is kept')
  const processing = await startCheckout(input())
  const processingId = (await order(processing.reference)).id
  intents.get(processing.paymentIntentId).status = 'processing'
  await expire(processingId); await expireUnpaidOrders(processingId)
  assert.equal((await order(processing.reference)).status, 'awaiting_payment', 'stock stays held while the bank processes')

  // Basket changed after a failed attempt: the old hold is released at once.
  const before = input()
  const firstTry = await startCheckout(before)
  const changed = await startCheckout({ ...before, checkout_key: crypto.randomUUID(), replaces_checkout_key: before.checkout_key, message: 'Livraison le matin' })
  assert.notEqual(changed.reference, firstTry.reference)
  assert.equal((await order(firstTry.reference)).status, 'expired')
  assert.equal(intents.get(firstTry.paymentIntentId).status, 'canceled')

  // Admin: cancel with full refund (auth required), stock released.
  const confirmedId = created.id
  assert.equal((await call(adminOrders, { body: { id: confirmedId, action: 'cancel' } })).statusCode, 401)
  const cancelled = await call(adminOrders, { body: { id: confirmedId, action: 'cancel' }, admin: true })
  assert.equal(cancelled.statusCode, 200, JSON.stringify(cancelled.body))
  assert.deepEqual(cancelled.body.data, { status: 'cancelled', refunded: true, amount: 39 })
  assert.equal(refunds.length, 1)
  assert.equal(refunds[0].payment_intent, first.paymentIntentId)
  assert.equal((await order(first.reference)).status, 'cancelled')
  assert.equal((await paymentOf(confirmedId)).status, 'refunded')
  assert.ok([...delivered.values()].some(mail => /annulée et remboursée/.test(mail.subject)))
  assert.equal((await startCheckout(input({ dates: request.dates }))).paid, false, 'a cancelled order frees its stock')
  assert.equal((await call(adminOrders, { body: { id: confirmedId, action: 'cancel' }, admin: true })).statusCode, 409, 'cannot cancel twice')
  // Refund made in the Stripe dashboard cancels the order too.
  const dashboardRefund = await startCheckout(input())
  pay(dashboardRefund.paymentIntentId)
  await emit({ type: 'payment_intent.succeeded', data: { object: intents.get(dashboardRefund.paymentIntentId) } })
  await emit({ type: 'charge.refunded', data: { object: { id: 'ch_test', payment_intent: dashboardRefund.paymentIntentId, refunded: true } } })
  assert.equal((await order(dashboardRefund.reference)).status, 'cancelled')

  // (The generic /api/db refusals are checked over HTTP: it uses bundler-style imports.)

  // Email outbox survives a provider outage.
  mailFails = true
  const queued = await startCheckout(input())
  pay(queued.paymentIntentId)
  await emit({ type: 'payment_intent.succeeded', data: { object: intents.get(queued.paymentIntentId) } })
  const queuedId = (await order(queued.reference)).id
  assert.ok(await db.prepare('SELECT id FROM order_emails WHERE id LIKE ? AND sent_at IS NULL').get(`${queuedId}:%`))
  mailFails = false; await flushOrderEmails()
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM order_emails WHERE id LIKE ? AND sent_at IS NULL').get(`${queuedId}:%`)).n, 0)

  console.log('PASS: one-step checkout (order + full payment), server pricing, stock hold and concurrency, blocked days, delivery and provider failures, signed webhooks with amount checks, confirmation without admin, return-page sync, safe expiry, basket change, admin cancel + refund, dashboard refund, durable emails. No external calls.')
} finally {
  db.close()
}

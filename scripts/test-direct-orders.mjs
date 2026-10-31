// Business/integration tests use only temporary storage and fake providers.
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
const { createRentalOrder, expireUnpaidOrders, confirmPaidOrder, flushOrderEmails } = await import('../src/lib/orders.js')
const { prepareCheckout } = await import('../src/lib/payment-checkout.js')
const { getStripe } = await import('../src/lib/stripe.js')
const { default: webhook } = await import('../pages/api/payments/webhook.js')
const stripe = getStripe()
const intents = new Map()
const idempotent = new Map()
const schedules = new Map()
stripe.customers.create = async () => ({ id: 'cus_test' })
stripe.customers.update = async () => ({ id: 'cus_test' })
stripe.products.create = async () => ({ id: 'prod_test' })
stripe.paymentIntents.create = async (args, options) => {
  const key = options.idempotencyKey
  if (idempotent.has(key)) return intents.get(idempotent.get(key))
  const id = `pi_${crypto.randomUUID()}`
  const intent = { ...args, id, status: 'requires_payment_method', client_secret: `${id}_secret`, amount_received: 0 }
  intents.set(id, intent); idempotent.set(key, id)
  return intent
}
stripe.paymentIntents.retrieve = async id => structuredClone(intents.get(id))
stripe.paymentIntents.cancel = async id => {
  const intent = intents.get(id)
  if (intent.status === 'processing' || intent.status === 'succeeded') throw new Error('Cannot cancel')
  intent.status = 'canceled'; return intent
}
stripe.subscriptionSchedules.create = async (args, options) => {
  if (!schedules.has(options.idempotencyKey)) schedules.set(options.idempotencyKey, { id: `sub_sched_${schedules.size}`, ...args })
  return schedules.get(options.idempotencyKey)
}
async function emit(event, validSignature = true) {
  const raw = JSON.stringify({ id: crypto.randomUUID(), ...event })
  const req = new PassThrough()
  req.method = 'POST'; req.headers = { 'stripe-signature': validSignature ? stripe.webhooks.generateTestHeaderString({ payload: raw, secret: process.env.STRIPE_WEBHOOK_SECRET }) : 'bad' }
  const res = { statusCode: 200, status(n) { this.statusCode = n; return this }, json(body) { this.body = body; return this } }
  const pending = webhook(req, res); req.end(raw); await pending
  return res
}
let nextDate = 0
function input(extra = {}) {
  const date = new Date(Date.now() + (60 + nextDate++) * 86400000).toISOString().slice(0, 10)
  return { checkout_key: crypto.randomUUID(), prenom: 'Test', nom: 'Client', phone: '0600000000', email: 'client@example.test', dates: [date], date, materials: [{ id: 'qa-material', quantity: 1 }], delivery_address: 'Adresse fictive de test', grand_total: 39, event_type: 'location-deco', ...extra }
}
const status = async id => (await db.prepare('SELECT status FROM reservations WHERE id = ?').get(id)).status
const expire = async id => db.prepare('UPDATE reservations SET expires_at = ? WHERE id = ?').run('2000-01-01T00:00:00.000Z', id)

try {
  await db.prepare('SELECT 1').get()
  await db.prepare("INSERT INTO materials (id, name, max_quantity, available) VALUES ('qa-material', 'Article test', 1, 1)").run()
  await db.prepare("INSERT INTO material_price_tiers (id, material_id, min_qty, price_weekday_ht, price_weekend_ht) VALUES ('qa-tier', 'qa-material', 1, 10, 10)").run()
  await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('bank_iban', 'QA-NOT-A-REAL-IBAN')").run()
  await db.prepare("UPDATE settings SET value = '15' WHERE key = 'delivery_base_fee'").run()
  await db.prepare("UPDATE settings SET value = '1.2' WHERE key = 'delivery_per_km'").run()
  const request = input()
  const order = await createRentalOrder(request)
  assert.equal(order.status, 'awaiting_payment')
  assert.equal(order.grand_total, 39)
  assert.equal(delivered.size, 2)
  assert.ok([...delivered.values()].some(mail => mail.to === 'notifications@example.test'))
  assert.ok(![...delivered.values()].some(mail => mail.to === 'admin@example.test'), 'notification recipient must not change or reuse the admin login when configured separately')
  assert.ok([...delivered.values()].every(mail => mail.from === 'OA Événementiel <contact@oa-evenementiel.fr>'))
  assert.equal((await createRentalOrder(request)).id, order.id, 'retry must reuse the same order')
  await assert.rejects(createRentalOrder({ ...request, materials: [{ id: 'qa-material', quantity: 2 }] }), /déjà/)
  await assert.rejects(createRentalOrder(input({ dates: request.dates })), /Stock insuffisant/)
  const concurrentInput = input()
  const competing = await Promise.allSettled([createRentalOrder(concurrentInput), createRentalOrder({ ...concurrentInput, checkout_key: crypto.randomUUID() })])
  assert.equal(competing.filter(r => r.status === 'fulfilled').length, 1, 'one unit cannot be sold twice')
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM reservations WHERE date = ?').get(concurrentInput.dates[0])).n, 1)
  for (const bad of [input({ materials: [{ id: 'missing', quantity: 1 }] }), input({ materials: [{ id: 'qa-material', quantity: 1.5 }] }), input({ grand_total: 0 }), input({ dates: ['2026-02-30'] }), input({ materials: [{ id: 'qa-material', quantity: 1 }, { id: 'qa-material', quantity: 1 }] })]) await assert.rejects(createRentalOrder(bad))
  const blocked = input()
  await db.prepare('INSERT INTO blocked_dates (id, date) VALUES (?, ?)').run(crypto.randomUUID(), blocked.dates[0])
  await assert.rejects(createRentalOrder(blocked), /indisponible/)
  geoFails = true
  await assert.rejects(createRentalOrder(input()), /livraison/)
  geoFails = false
  const missingProvider = input()
  delete process.env.STRIPE_SECRET_KEY
  await db.prepare("DELETE FROM settings WHERE key = 'bank_iban'").run()
  await assert.rejects(createRentalOrder(missingProvider), /indisponible/)
  process.env.STRIPE_SECRET_KEY = 'sk_test_local_fake_provider'
  await db.prepare("INSERT INTO settings (key, value) VALUES ('bank_iban', 'QA-NOT-A-REAL-IBAN')").run()
  const checkout = await prepareCheckout(order.id, 2, 'card')
  assert.equal(checkout.schedule.length, 2)
  assert.equal((await prepareCheckout(order.id, 2, 'card')).clientSecret, checkout.clientSecret)
  assert.equal(intents.size, 1)
  await assert.rejects(prepareCheckout(order.id, 1, 'virement'), /déjà/)
  const payment = await db.prepare('SELECT * FROM payments WHERE reservation_id = ? AND installment_index = 0').get(order.id)
  const intent = intents.get(payment.stripe_payment_intent_id)
  intent.status = 'succeeded'; intent.amount_received = intent.amount; intent.payment_method = 'pm_test'
  const event = { type: 'payment_intent.succeeded', data: { object: intent } }
  assert.equal((await emit(event, false)).statusCode, 400)
  assert.equal(await status(order.id), 'awaiting_payment')
  assert.equal((await emit({ ...event, data: { object: { ...intent, amount_received: 1 } } })).statusCode, 400)
  assert.equal((await emit(event)).statusCode, 200)
  assert.equal(await status(order.id), 'confirmed')
  const count = delivered.size
  assert.equal((await emit(event)).statusCode, 200)
  assert.equal(delivered.size, count)
  assert.equal(schedules.size, 1, 'duplicate webhook cannot duplicate future charges')
  await emit({ type: 'payment_intent.payment_failed', data: { object: { ...intent, last_payment_error: { message: 'old failure' } } } })
  assert.equal((await db.prepare('SELECT status FROM payments WHERE id = ?').get(payment.id)).status, 'paid')
  await assert.rejects(prepareCheckout(order.id, 2, 'card'))
  const abandoned = await createRentalOrder(input())
  await expire(abandoned.id); await expireUnpaidOrders(abandoned.id)
  assert.equal(await status(abandoned.id), 'expired')
  await assert.rejects(prepareCheckout(abandoned.id, 1, 'card'))
  const abandonedCard = await createRentalOrder(input())
  await prepareCheckout(abandonedCard.id, 1, 'card')
  await expire(abandonedCard.id); await expireUnpaidOrders(abandonedCard.id)
  assert.equal(await status(abandonedCard.id), 'expired')
  const canceled = await db.prepare('SELECT stripe_payment_intent_id FROM payments WHERE reservation_id = ?').get(abandonedCard.id)
  assert.equal(intents.get(canceled.stripe_payment_intent_id).status, 'canceled')
  const processing = await createRentalOrder(input())
  await prepareCheckout(processing.id, 1, 'card')
  const processingPayment = await db.prepare('SELECT stripe_payment_intent_id FROM payments WHERE reservation_id = ?').get(processing.id)
  intents.get(processingPayment.stripe_payment_intent_id).status = 'processing'
  await expire(processing.id); await expireUnpaidOrders(processing.id)
  assert.equal(await status(processing.id), 'awaiting_payment', 'stock must remain held when payment cannot safely be canceled')
  const bankOrder = await createRentalOrder(input())
  const bank = await prepareCheckout(bankOrder.id, 1, 'virement')
  assert.ok(Date.parse(bank.expiresAt) > Date.now() + 47 * 3600000)
  assert.equal(await status(bankOrder.id), 'awaiting_payment')
  await db.prepare("UPDATE payments SET status = 'paid' WHERE reservation_id = ? AND installment_index = 0").run(bankOrder.id)
  await confirmPaidOrder(bankOrder.id)
  assert.equal(await status(bankOrder.id), 'confirmed')
  mailFails = true
  const queued = await createRentalOrder(input())
  assert.ok(await db.prepare('SELECT id FROM order_emails WHERE id LIKE ? AND sent_at IS NULL').get(`${queued.id}:%`))
  mailFails = false; await flushOrderEmails()
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM order_emails WHERE id LIKE ? AND sent_at IS NULL').get(`${queued.id}:%`)).n, 0)
  const interrupted = await createRentalOrder(input())
  await prepareCheckout(interrupted.id, 1, 'card')
  const beforeRecovery = intents.size
  await db.prepare('UPDATE payments SET stripe_payment_intent_id = NULL WHERE reservation_id = ?').run(interrupted.id)
  await expire(interrupted.id); await expireUnpaidOrders(interrupted.id)
  assert.equal(intents.size, beforeRecovery, 'recover the original Stripe attempt rather than creating another')
  assert.equal(await status(interrupted.id), 'expired')
  const delayedWebhook = await createRentalOrder(input())
  await prepareCheckout(delayedWebhook.id, 1, 'card')
  const delayedPayment = await db.prepare('SELECT stripe_payment_intent_id FROM payments WHERE reservation_id = ?').get(delayedWebhook.id)
  const delayedIntent = intents.get(delayedPayment.stripe_payment_intent_id)
  delayedIntent.status = 'succeeded'; delayedIntent.amount_received = delayedIntent.amount
  await expire(delayedWebhook.id); await expireUnpaidOrders(delayedWebhook.id)
  assert.equal(await status(delayedWebhook.id), 'confirmed', 'reconcile a successful payment before releasing stock')
  const partialDay = input({ time_type: 'hours', hours: ['10:00'] })
  await db.prepare('INSERT INTO blocked_hours (id, date, hour) VALUES (?, ?, ?)').run(crypto.randomUUID(), partialDay.dates[0], '09:00')
  await assert.rejects(createRentalOrder({ ...partialDay, time_type: 'full' }), /créneau/)
  await assert.rejects(createRentalOrder({ ...partialDay, hours: ['09:00'] }), /créneau/)
  assert.equal((await createRentalOrder(partialDay)).status, 'awaiting_payment')
  console.log('PASS: server pricing, stock concurrency, checkout idempotency, blocked dates, delivery failure, provider unavailability, signed webhooks, amount checks, duplicate/old events, installments, safe expiry, bank receipt, durable email retry. No external calls.')
} finally {
  db.close()
}

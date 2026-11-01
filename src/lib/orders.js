import crypto from 'node:crypto'
import db, { generateReservationReference } from './sqlite-db.js'
import { sanitizeReservation } from './public-submissions.js'
import { getDayType, getUnitPriceTtc, groupTiersByMaterial } from './pricing.js'
import { getStripe, isStripeConfigured, isCheckoutConfigured, createOrderPaymentIntent, refundOrderPayment } from './stripe.js'
import { sendEmail, isEmailConfigured, confirmationEmail, cancellationEmail } from './email.js'
import { SITE_URL } from './site.js'

// Direct rental orders, Amazon-style: the customer orders and pays in one
// go (Stripe), the order is confirmed the moment the payment succeeds — no
// validation by the team. The only admin action is a cancellation with full
// refund (cancelOrder).
//
// Statuses: awaiting_payment (stock held while the customer pays, 30 min)
// → confirmed (paid) | expired (not paid in time, stock released)
// confirmed → cancelled (refunded by the team, stock released).

export function orderError(message, status = 409) { return Object.assign(new Error(message), { status }) }

const HOLD_MINUTES = 30

async function queueEmails(tx, order, event) {
  const args = {
    name: [order.prenom, order.nom].filter(Boolean).join(' '), reference: order.reference,
    dateLabel: new Date(order.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    grandTotal: order.grand_total, trackingUrl: `${SITE_URL}/suivi`,
  }
  const content = event === 'confirmed' ? confirmationEmail(args) : cancellationEmail(args)
  const emails = [{ to: order.email, ...content, suffix: 'client' }]
  const notificationEmail = process.env.NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL
  if (notificationEmail) emails.push({ to: notificationEmail, subject: `${event === 'confirmed' ? 'Nouvelle commande payée' : 'Commande annulée et remboursée'} — ${order.reference}`, html: content.html, suffix: 'admin' })
  for (const email of emails) await tx.prepare('INSERT OR IGNORE INTO order_emails (id, recipient, subject, html) VALUES (?, ?, ?, ?)').run(`${order.id}:${event}:${email.suffix}`, email.to, email.subject, email.html)
}

// Durable outbox: an email failure never rolls back a booking/payment. Retries
// use the same provider idempotency key; unconfigured email stays queued.
export async function flushOrderEmails() {
  if (!isEmailConfigured()) return
  const rows = await db.prepare('SELECT * FROM order_emails WHERE sent_at IS NULL LIMIT 20').all()
  for (const row of rows) {
    try {
      await sendEmail({ to: row.recipient, subject: row.subject, html: row.html, idempotencyKey: row.id })
      await db.prepare('UPDATE order_emails SET sent_at = ?, last_error = NULL WHERE id = ?').run(new Date().toISOString(), row.id)
    } catch (error) { await db.prepare('UPDATE order_emails SET last_error = ? WHERE id = ?').run(String(error.message).slice(0, 500), row.id) }
  }
}

// Called by the webhook, the return page and expiry reconciliation — whoever
// sees the succeeded PaymentIntent first. Amount and currency are checked
// against the order; repeated calls are harmless.
export async function recordPaymentSuccess(intent) {
  const payment = await db.prepare('SELECT * FROM payments WHERE stripe_payment_intent_id = ?').get(intent.id)
  if (!payment) return null
  if (intent.status !== 'succeeded') return null
  if (intent.currency !== 'eur' || intent.amount_received !== Math.round(payment.amount * 100)) throw orderError('Montant Stripe incohérent.', 400)
  await db.prepare("UPDATE payments SET status = 'paid', paid_at = COALESCE(paid_at, ?) WHERE id = ? AND status NOT IN ('paid', 'refunded')").run(new Date().toISOString(), payment.id)
  await db.writeTransaction(async tx => {
    const order = await tx.prepare('SELECT * FROM reservations WHERE id = ?').get(payment.reservation_id)
    if (!order || order.status !== 'awaiting_payment') return
    await tx.prepare("UPDATE reservations SET status = 'confirmed', expires_at = NULL WHERE id = ?").run(order.id)
    await queueEmails(tx, order, 'confirmed')
  })
  await flushOrderEmails()
  return payment.reservation_id
}

// Re-reads an order's PaymentIntent from Stripe and records it if paid —
// lets the return page confirm the order even before the webhook arrives.
export async function syncOrderPayment(reservationId) {
  const payment = await db.prepare('SELECT stripe_payment_intent_id FROM payments WHERE reservation_id = ? AND stripe_payment_intent_id IS NOT NULL').get(reservationId)
  if (!payment || !isStripeConfigured()) return null
  const intent = await getStripe().paymentIntents.retrieve(payment.stripe_payment_intent_id)
  if (intent.status === 'succeeded') await recordPaymentSuccess(intent)
  return intent
}

// Releases the stock of orders not paid in time. Before expiring, the
// PaymentIntent is checked (a payment may have succeeded without its
// webhook yet) and cancelled, so a late payment can never land on an order
// whose stock was given back.
export async function expireUnpaidOrders(reservationId) {
  const now = new Date().toISOString()
  const rows = await db.prepare("SELECT id FROM reservations WHERE order_kind = 'rental' AND status = 'awaiting_payment' AND expires_at <= ? AND (payment_lock_until IS NULL OR payment_lock_until < ?)" + (reservationId ? ' AND id = ?' : '') + ' LIMIT 20').all(...[now, now, ...(reservationId ? [reservationId] : [])])
  for (const { id } of rows) {
    const token = crypto.randomUUID()
    const claimed = await db.prepare("UPDATE reservations SET payment_lock = ?, payment_lock_until = ? WHERE id = ? AND status = 'awaiting_payment' AND (payment_lock_until IS NULL OR payment_lock_until < ?)").run(token, new Date(Date.now() + 300000).toISOString(), id, now)
    if (!claimed.changes) continue
    try {
      const payment = await db.prepare('SELECT * FROM payments WHERE reservation_id = ?').get(id)
      if (payment?.stripe_payment_intent_id) {
        // Without the keys the intent can't be checked: keep the stock
        // held rather than risk releasing a paid order.
        if (!isStripeConfigured()) continue
        const stripe = getStripe()
        const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id)
        if (intent.status === 'succeeded') { await recordPaymentSuccess(intent); continue }
        if (intent.status === 'processing') continue
        if (intent.status !== 'canceled') await stripe.paymentIntents.cancel(intent.id)
        await db.prepare("UPDATE payments SET status = 'canceled' WHERE id = ?").run(payment.id)
      }
      await db.prepare("UPDATE reservations SET status = 'expired' WHERE id = ? AND status = 'awaiting_payment' AND payment_lock = ?").run(id, token)
    } catch (error) { console.error('[orders] expiration deferred', id, error.message) }
    finally { await db.prepare('UPDATE reservations SET payment_lock = NULL, payment_lock_until = NULL WHERE id = ? AND payment_lock = ?').run(id, token) }
  }
}

// The customer changed their basket or details after a payment attempt:
// the checkout page starts a new order and names the previous one here, so
// its stock hold is released at once instead of after HOLD_MINUTES. Only
// an unpaid order is released; its payment is cancelled first so it can't
// succeed afterwards.
async function releaseReplacedOrder(checkoutKey) {
  const old = await db.prepare("SELECT id FROM reservations WHERE checkout_key = ? AND status = 'awaiting_payment'").get(checkoutKey)
  if (!old) return
  await withPaymentLock(old.id, async () => {
    const payment = await db.prepare('SELECT * FROM payments WHERE reservation_id = ?').get(old.id)
    if (payment?.stripe_payment_intent_id) {
      const stripe = getStripe()
      const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id)
      if (intent.status === 'succeeded') { await recordPaymentSuccess(intent); throw orderError('Votre commande précédente a déjà été payée. Consultez vos emails ou le suivi de commande.') }
      if (intent.status === 'processing') throw orderError('Un paiement est en cours de traitement pour cette commande. Patientez quelques instants.')
      if (intent.status !== 'canceled') await stripe.paymentIntents.cancel(intent.id)
      await db.prepare("UPDATE payments SET status = 'canceled' WHERE id = ?").run(payment.id)
    }
    await db.prepare("UPDATE reservations SET status = 'expired' WHERE id = ? AND status = 'awaiting_payment'").run(old.id)
  }).catch(error => { if (error.status !== 409 || /payée|traitement/.test(error.message)) throw error })
}

// Validates the basket server-side (prices, stock, dates, delivery) and
// holds the stock for HOLD_MINUTES. Idempotent on `checkout_key`: the same
// checkout retried returns the same order.
async function createRentalOrder(input) {
  if (!Array.isArray(input.materials) || !input.materials.length || input.materials.some(m => !m || typeof m !== 'object')) throw orderError('Votre panier est vide.', 400)
  const checkoutKey = input.checkout_key
  if (typeof checkoutKey !== 'string' || !/^[a-zA-Z0-9-]{32,80}$/.test(checkoutKey)) throw orderError('Actualisez la page avant de commander.', 400)
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify([input.email, input.prenom, input.nom, input.phone, input.dates, input.materials?.map(m => [m.id, m.quantity]), input.delivery_address])).digest('hex')
  const previous = await db.prepare('SELECT * FROM reservations WHERE checkout_key = ?').get(checkoutKey)
  if (previous) {
    if (previous.checkout_fingerprint === fingerprint) return previous
    // Basket or details changed after a failed payment: the old hold is
    // released and a new order is started below with a fresh key.
    throw orderError('Votre commande a changé. Actualisez la page puis réessayez.', 409)
  }
  const { record, error } = await sanitizeReservation(input)
  if (error) throw orderError(error, 400)
  if (!record.materials.length) throw orderError('Votre panier est vide.', 400)
  if (!isCheckoutConfigured()) throw orderError('Le paiement en ligne est momentanément indisponible. Contactez-nous pour réserver.', 503)
  if (typeof input.replaces_checkout_key === 'string') await releaseReplacedOrder(input.replaces_checkout_key)
  await expireUnpaidOrders()
  const id = crypto.randomUUID()
  const reference = await generateReservationReference()
  return db.writeTransaction(async tx => {
    const duplicate = await tx.prepare('SELECT * FROM reservations WHERE checkout_key = ?').get(checkoutKey)
    if (duplicate) {
      if (duplicate.checkout_fingerprint !== fingerprint) throw orderError('Votre commande a changé. Actualisez la page puis réessayez.')
      return duplicate
    }
    const active = await tx.prepare("SELECT dates, date, materials FROM reservations WHERE status IN ('pending', 'awaiting_payment', 'confirmed')").all()
    for (const date of record.dates) {
      if (await tx.prepare('SELECT id FROM blocked_dates WHERE date = ?').get(date) || await tx.prepare('SELECT hour FROM blocked_hours WHERE date = ?').get(date)) throw orderError('Une des dates choisies n’est plus disponible. Choisissez d’autres dates.')
    }
    const tiers = groupTiersByMaterial(await tx.prepare('SELECT * FROM material_price_tiers').all())
    let total = 0
    for (const item of record.materials) {
      const material = await tx.prepare('SELECT * FROM materials WHERE id = ?').get(item.id)
      if (!material?.available) throw orderError('Un article n’est plus disponible. Retirez-le du panier.')
      for (const date of record.dates) {
        let used = 0
        for (const existing of active) {
          const dates = JSON.parse(existing.dates || '[]')
          if (!(dates.length ? dates : [existing.date]).includes(date)) continue
          used += JSON.parse(existing.materials || '[]').filter(m => String(m.id) === item.id).reduce((sum, m) => sum + Number(m.quantity), 0)
        }
        if (used + item.quantity > material.max_quantity) throw orderError(`Stock insuffisant pour ${material.name} à ces dates. Réduisez la quantité ou changez de dates.`)
      }
      item.price = getUnitPriceTtc(tiers[item.id], getDayType(record.date), item.quantity)
      if (item.price <= 0) throw orderError(`Tarif indisponible pour ${material.name}.`)
      item.name = material.name
      total += Math.round(item.price * 100) * item.quantity
    }
    record.materials_total = total / 100
    record.grand_total = (total + Math.round(record.delivery_fee * 100)) / 100
    if (!Number.isFinite(Number(input.grand_total)) || Math.abs(Number(input.grand_total) - record.grand_total) > 0.011) throw orderError('Le total a changé. Vérifiez le récapitulatif puis réessayez.')
    const result = { ...record, id, reference, rental_hours: '[]', status: 'awaiting_payment', order_kind: 'rental', payment_method: 'stripe', checkout_key: checkoutKey, checkout_fingerprint: fingerprint, expires_at: new Date(Date.now() + HOLD_MINUTES * 60000).toISOString(), created_at: new Date().toISOString() }
    const stored = { ...result, dates: JSON.stringify(result.dates), materials: JSON.stringify(result.materials) }
    const keys = Object.keys(stored)
    await tx.prepare(`INSERT INTO reservations (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map(k => stored[k]))
    await tx.prepare(`INSERT INTO payments (id, reservation_id, method, amount, installment_index, installment_label, status, created_at)
      VALUES (?, ?, 'stripe', ?, 0, 'Paiement intégral', 'pending', ?)`).run(crypto.randomUUID(), id, result.grand_total, result.created_at)
    return stored
  })
}

// Serialize payment changes on one order across requests/instances, so
// expiry can never release a basket while its payment is being prepared.
async function withPaymentLock(id, fn) {
  await expireUnpaidOrders(id)
  const now = new Date().toISOString()
  const token = crypto.randomUUID()
  const claim = await db.prepare("UPDATE reservations SET payment_lock = ?, payment_lock_until = ? WHERE id = ? AND status IN ('awaiting_payment', 'confirmed') AND (payment_lock_until IS NULL OR payment_lock_until < ?)").run(token, new Date(Date.now() + 300000).toISOString(), id, now)
  if (!claim.changes) throw orderError('Le délai de paiement de cette commande est dépassé. Actualisez la page pour recommencer.')
  try { return await fn() }
  finally { await db.prepare('UPDATE reservations SET payment_lock = NULL, payment_lock_until = NULL WHERE id = ? AND payment_lock = ?').run(id, token) }
}

// POST /api/checkout: creates (or resumes) the order and its PaymentIntent,
// returns what the payment form needs to confirm it.
export async function startCheckout(input) {
  const order = await createRentalOrder(input)
  return withPaymentLock(order.id, async () => {
    const current = await db.prepare('SELECT * FROM reservations WHERE id = ?').get(order.id)
    const payment = await db.prepare('SELECT * FROM payments WHERE reservation_id = ?').get(current.id)
    let intent = payment.stripe_payment_intent_id ? await getStripe().paymentIntents.retrieve(payment.stripe_payment_intent_id) : null
    if (!intent) {
      intent = await createOrderPaymentIntent(current)
      await db.prepare('UPDATE payments SET stripe_payment_intent_id = ? WHERE id = ?').run(intent.id, payment.id)
    }
    // Already paid (e.g. a retried click after success): the page goes
    // straight to the confirmation.
    if (intent.status === 'succeeded') await recordPaymentSuccess(intent)
    if (intent.status === 'canceled') throw orderError('Ce paiement a expiré. Actualisez la page pour recommencer.')
    return { reference: current.reference, grandTotal: current.grand_total, paymentIntentId: intent.id, clientSecret: intent.client_secret, paid: intent.status === 'succeeded' }
  })
}

// Espace OA: cancels a paid order and refunds it in full (the stock is
// released since cancelled orders no longer hold any). An order still
// awaiting payment is simply cancelled.
export async function cancelOrder(reservationId) {
  return withPaymentLock(reservationId, async () => {
    const order = await db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId)
    if (order.order_kind !== 'rental') throw orderError('Seules les commandes en ligne peuvent être annulées ici.', 400)
    const payment = await db.prepare('SELECT * FROM payments WHERE reservation_id = ?').get(reservationId)
    const intent = payment?.stripe_payment_intent_id ? await getStripe().paymentIntents.retrieve(payment.stripe_payment_intent_id) : null
    let refundId = null
    if (intent?.status === 'succeeded') {
      const refund = await refundOrderPayment(intent.id, reservationId)
      if (!['succeeded', 'pending', 'requires_action'].includes(refund.status)) throw orderError(`Le remboursement a été refusé par Stripe (${refund.status}). Vérifiez dans le tableau de bord Stripe.`, 502)
      refundId = refund.id
    } else if (intent && !['canceled', 'succeeded'].includes(intent.status)) {
      await getStripe().paymentIntents.cancel(intent.id)
    }
    await db.writeTransaction(async tx => {
      await tx.prepare("UPDATE reservations SET status = 'cancelled', expires_at = NULL WHERE id = ?").run(reservationId)
      if (payment) await tx.prepare('UPDATE payments SET status = ?, refund_id = ?, refunded_at = ? WHERE id = ?').run(refundId ? 'refunded' : 'canceled', refundId, refundId ? new Date().toISOString() : null, payment.id)
      if (refundId) await queueEmails(tx, order, 'cancelled')
    })
    await flushOrderEmails()
    return { status: 'cancelled', refunded: !!refundId, amount: refundId ? order.grand_total : 0 }
  })
}

// A full refund made from the Stripe dashboard cancels the order here too.
export async function recordExternalRefund(charge) {
  if (!charge.payment_intent || !charge.refunded) return
  const payment = await db.prepare('SELECT * FROM payments WHERE stripe_payment_intent_id = ?').get(charge.payment_intent)
  if (!payment || payment.status === 'refunded') return
  await db.writeTransaction(async tx => {
    const order = await tx.prepare('SELECT * FROM reservations WHERE id = ?').get(payment.reservation_id)
    await tx.prepare("UPDATE payments SET status = 'refunded', refunded_at = COALESCE(refunded_at, ?) WHERE id = ?").run(new Date().toISOString(), payment.id)
    if (order && order.status === 'confirmed') {
      await tx.prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?").run(order.id)
      await queueEmails(tx, order, 'cancelled')
    }
  })
  await flushOrderEmails()
}

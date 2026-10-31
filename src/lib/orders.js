import crypto from 'node:crypto'
import db, { generateReservationReference } from './sqlite-db.js'
import { sanitizeReservation } from './public-submissions.js'
import { getDayType, getUnitPriceTtc, groupTiersByMaterial } from './pricing.js'
import { getStripe, isStripeConfigured, isCardCheckoutConfigured, createFirstInstallmentIntent, createInstallmentAutoCharge } from './stripe.js'
import { sendEmail, isEmailConfigured, confirmationEmail, orderCreatedEmail } from './email.js'
import { SITE_URL } from './site.js'

export function orderError(message, status = 409) { return Object.assign(new Error(message), { status }) }
const receipt = order => Object.fromEntries(['id', 'reference', 'status', 'order_kind', 'expires_at', 'grand_total', 'materials_total', 'delivery_fee'].map(key => [key, order[key]]))

async function queueEmails(tx, order, event) {
  const args = {
    name: [order.prenom, order.nom].filter(Boolean).join(' '), reference: order.reference,
    dateLabel: new Date(order.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    grandTotal: order.grand_total, trackingUrl: `${SITE_URL}/suivi`, expiresAt: order.expires_at,
  }
  const content = event === 'confirmed' ? confirmationEmail(args) : orderCreatedEmail(args)
  const emails = [{ to: order.email, ...content, suffix: 'client' }]
  const notificationEmail = process.env.NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL
  if (notificationEmail) emails.push({ to: notificationEmail, subject: `${event === 'confirmed' ? 'Paiement reçu' : 'Nouvelle commande'} — ${order.reference}`, html: content.html, suffix: 'admin' })
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

export async function confirmPaidOrder(reservationId) {
  await db.writeTransaction(async tx => {
    const order = await tx.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId)
    if (!order || order.status !== 'awaiting_payment') return
    const first = await tx.prepare('SELECT status FROM payments WHERE reservation_id = ? AND installment_index = 0').get(reservationId)
    if (first?.status !== 'paid') return
    await tx.prepare("UPDATE reservations SET status = 'confirmed', expires_at = NULL WHERE id = ?").run(reservationId)
    await queueEmails(tx, order, 'confirmed')
  })
  await flushOrderEmails()
}

// Also used by expiry reconciliation when Stripe has succeeded before its
// webhook arrives. Amount and currency are verified against our saved schedule.
export async function recordCardSuccess(intent) {
  const payment = await db.prepare('SELECT * FROM payments WHERE stripe_payment_intent_id = ?').get(intent.id)
  if (!payment) return
  if (intent.currency !== 'eur' || intent.amount_received !== Math.round(payment.amount * 100)) throw orderError('Montant Stripe incohérent.', 400)
  await db.prepare("UPDATE payments SET status = 'paid', paid_at = COALESCE(paid_at, ?) WHERE id = ?").run(new Date().toISOString(), payment.id)
  await confirmPaidOrder(payment.reservation_id)
  if (payment.installment_index === 0 && intent.customer && intent.payment_method) {
    await getStripe().customers.update(intent.customer, { invoice_settings: { default_payment_method: intent.payment_method } })
    const remaining = await db.prepare("SELECT * FROM payments WHERE reservation_id = ? AND installment_index > 0 AND method = 'card' AND status = 'pending' AND stripe_subscription_id IS NULL").all(payment.reservation_id)
    for (const installment of remaining) {
      const schedule = await createInstallmentAutoCharge({ customerId: intent.customer, amount: installment.amount, dueDateStr: installment.due_date, reservationId: payment.reservation_id, installmentId: installment.id })
      await db.prepare('UPDATE payments SET stripe_subscription_id = ? WHERE id = ?').run(schedule.id, installment.id)
    }
  }
}

export async function expireUnpaidOrders(reservationId) {
  const now = new Date().toISOString()
  const rows = await db.prepare("SELECT id FROM reservations WHERE order_kind = 'rental' AND status = 'awaiting_payment' AND expires_at <= ? AND (payment_lock_until IS NULL OR payment_lock_until < ?)" + (reservationId ? ' AND id = ?' : '') + ' LIMIT 20').all(...[now, now, ...(reservationId ? [reservationId] : [])])
  for (const { id } of rows) {
    const token = crypto.randomUUID()
    const claimed = await db.prepare("UPDATE reservations SET payment_lock = ?, payment_lock_until = ? WHERE id = ? AND status = 'awaiting_payment' AND (payment_lock_until IS NULL OR payment_lock_until < ?)").run(token, new Date(Date.now() + 300000).toISOString(), id, now)
    if (!claimed.changes) continue
    try {
      const payments = await db.prepare('SELECT * FROM payments WHERE reservation_id = ?').all(id)
      let safeToExpire = !payments.some(p => p.status === 'paid')
      if (payments.some(p => p.installment_index === 0 && p.status === 'paid')) await confirmPaidOrder(id)
      for (const payment of payments.filter(p => p.method === 'card' && !p.stripe_payment_intent_id)) {
        if (!isStripeConfigured()) { safeToExpire = false; continue }
        const order = await db.prepare('SELECT stripe_customer_id FROM reservations WHERE id = ?').get(id)
        const recovered = await createFirstInstallmentIntent({ customerId: order.stripe_customer_id, amount: payment.amount, reservationId: id, installmentId: payment.id, needsFutureUsage: payments.length > 1 })
        payment.stripe_payment_intent_id = recovered.id
        await db.prepare('UPDATE payments SET stripe_payment_intent_id = ? WHERE id = ?').run(recovered.id, payment.id)
      }
      for (const payment of payments.filter(p => p.stripe_payment_intent_id)) {
        if (!isStripeConfigured()) { safeToExpire = false; break }
        const stripe = getStripe()
        const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id)
        if (intent.status === 'succeeded') { await recordCardSuccess(intent); safeToExpire = false }
        else if (intent.status !== 'canceled') {
          // If processing/cancellation fails, retain stock until a later retry.
          await stripe.paymentIntents.cancel(intent.id)
        }
      }
      // If recovery is unavailable, keep the stock until a safe later retry.
      if (payments.some(p => p.method === 'card' && !p.stripe_payment_intent_id)) safeToExpire = false
      if (safeToExpire) await db.prepare("UPDATE reservations SET status = 'expired' WHERE id = ? AND status = 'awaiting_payment' AND payment_lock = ? AND NOT EXISTS (SELECT 1 FROM payments WHERE reservation_id = ? AND status = 'paid')").run(id, token, id)
    } catch (error) { console.error('[orders] expiration deferred', id, error.message) }
    finally { await db.prepare('UPDATE reservations SET payment_lock = NULL, payment_lock_until = NULL WHERE id = ? AND payment_lock = ?').run(id, token) }
  }
}

export async function createRentalOrder(input) {
  if (!Array.isArray(input.materials) || !input.materials.length || input.materials.some(m => !m || typeof m !== 'object')) throw orderError('Articles invalides.', 400)
  const checkoutKey = input.checkout_key
  if (typeof checkoutKey !== 'string' || !/^[a-zA-Z0-9-]{32,80}$/.test(checkoutKey)) throw orderError('Actualisez le formulaire avant de commander.', 400)
  const hours = input.time_type === 'hours' ? input.hours : []
  if (!Array.isArray(hours) || (input.time_type === 'hours' && !hours.length) || hours.some(h => typeof h !== 'string' || !/^(0[89]|1[0-9]|20):00$/.test(h)) || hours.length > 13) throw orderError('Créneaux horaires invalides.', 400)
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify([input.email, input.prenom, input.nom, input.phone, input.dates, input.materials?.map(m => [m.id, m.quantity]), input.delivery_address, hours])).digest('hex')
  const previous = await db.prepare('SELECT * FROM reservations WHERE checkout_key = ?').get(checkoutKey)
  if (previous) {
    if (previous.checkout_fingerprint !== fingerprint) throw orderError('Ce formulaire a déjà enregistré une autre commande. Recommencez depuis le catalogue.')
    return receipt(previous)
  }
  const { record, error } = await sanitizeReservation(input)
  if (error) throw orderError(error, 400)
  if (!record.materials.length) throw orderError('Ajoutez du matériel à votre panier. Pour une prestation sur mesure, contactez-nous.', 400)
  const bank = await db.prepare("SELECT value FROM settings WHERE key = 'bank_iban'").get()
  if (!isCardCheckoutConfigured() && !bank?.value) throw orderError('La commande en ligne est momentanément indisponible. Contactez-nous pour un devis.', 503)
  await expireUnpaidOrders()
  const id = crypto.randomUUID()
  const reference = await generateReservationReference()
  const order = await db.writeTransaction(async tx => {
    const duplicate = await tx.prepare('SELECT * FROM reservations WHERE checkout_key = ?').get(checkoutKey)
    if (duplicate) {
      if (duplicate.checkout_fingerprint !== fingerprint) throw orderError('Ce formulaire a déjà enregistré une autre commande.')
      return duplicate
    }
    const active = await tx.prepare("SELECT dates, date, materials FROM reservations WHERE status IN ('pending', 'awaiting_payment', 'confirmed')").all()
    for (const date of record.dates) {
      const blockedHours = await tx.prepare('SELECT hour FROM blocked_hours WHERE date = ?').all(date)
      if (await tx.prepare('SELECT id FROM blocked_dates WHERE date = ?').get(date) || blockedHours.some(h => !hours.length || hours.includes(h.hour))) throw orderError('Une date ou un créneau choisi est indisponible. Choisissez une autre date ou un autre créneau.')
    }
    const tiers = groupTiersByMaterial(await tx.prepare('SELECT * FROM material_price_tiers').all())
    let total = 0
    for (const item of record.materials) {
      const material = await tx.prepare('SELECT * FROM materials WHERE id = ?').get(item.id)
      if (!material?.available) throw orderError('Un article n’est plus disponible.')
      for (const date of record.dates) {
        let used = 0
        for (const existing of active) {
          const dates = JSON.parse(existing.dates || '[]')
          if (!(dates.length ? dates : [existing.date]).includes(date)) continue
          used += JSON.parse(existing.materials || '[]').filter(m => String(m.id) === item.id).reduce((sum, m) => sum + Number(m.quantity), 0)
        }
        if (used + item.quantity > material.max_quantity) throw orderError(`Stock insuffisant pour ${material.name}. Actualisez le panier ou changez de date.`)
      }
      item.price = getUnitPriceTtc(tiers[item.id], getDayType(record.date), item.quantity)
      if (item.price <= 0) throw orderError(`Tarif indisponible pour ${material.name}.`)
      item.name = material.name
      total += Math.round(item.price * 100) * item.quantity
    }
    record.materials_total = total / 100
    record.grand_total = (total + Math.round(record.delivery_fee * 100)) / 100
    if (!Number.isFinite(Number(input.grand_total)) || Math.abs(Number(input.grand_total) - record.grand_total) > 0.011) throw orderError('Le tarif a changé. Recalculez la livraison et vérifiez le récapitulatif avant de commander.')
    const result = { ...record, id, reference, rental_hours: JSON.stringify(hours), status: 'awaiting_payment', order_kind: 'rental', checkout_key: checkoutKey, checkout_fingerprint: fingerprint, expires_at: new Date(Date.now() + 30 * 60000).toISOString(), created_at: new Date().toISOString() }
    const stored = { ...result, dates: JSON.stringify(result.dates), materials: JSON.stringify(result.materials) }
    const keys = Object.keys(stored)
    await tx.prepare(`INSERT INTO reservations (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map(k => stored[k]))
    await queueEmails(tx, result, 'created')
    return result
  })
  await flushOrderEmails()
  return receipt(order)
}

// Serialize checkout changes across requests/instances. Stripe network calls
// are bounded; expiry cannot release a basket while payment is being prepared.
export async function withPaymentLock(id, fn) {
  await expireUnpaidOrders(id)
  const now = new Date().toISOString()
  const token = crypto.randomUUID()
  const claim = await db.prepare("UPDATE reservations SET payment_lock = ?, payment_lock_until = ? WHERE id = ? AND status = 'awaiting_payment' AND (payment_lock_until IS NULL OR payment_lock_until < ?)").run(token, new Date(Date.now() + 300000).toISOString(), id, now)
  if (!claim.changes) throw orderError('Commande expirée, déjà réglée ou paiement en préparation. Actualisez le suivi.')
  try { return await fn() }
  finally { await db.prepare('UPDATE reservations SET payment_lock = NULL, payment_lock_until = NULL WHERE id = ? AND payment_lock = ?').run(id, token) }
}

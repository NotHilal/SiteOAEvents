import crypto from 'node:crypto'
import db from './sqlite-db.js'
import { withPaymentLock, orderError } from './orders.js'
import { getStripe, isCardCheckoutConfigured, getOrCreateCustomer, computeInstallmentSchedule, createFirstInstallmentIntent, getInstallmentTierEligibility } from './stripe.js'

export async function prepareCheckout(reservationId, plan, method) {
  const tier = plan == null ? 1 : Number(plan)
  if (![1, 2, 3, 4].includes(tier) || typeof reservationId !== 'string') throw orderError('Commande ou échéancier invalide.', 400)
  return withPaymentLock(reservationId, async () => {
    const order = await db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId)
    if (!order || !(order.grand_total > 0)) throw orderError('Commande introuvable ou montant invalide.', 400)
    if (method === 'card' && !isCardCheckoutConfigured()) throw orderError('Le paiement par carte est indisponible.', 503)
    let bank
    if (method === 'virement') {
      const rows = await db.prepare("SELECT key, value FROM settings WHERE key IN ('bank_holder','bank_iban','bank_bic')").all()
      bank = Object.fromEntries(rows.map(r => [r.key.replace('bank_', ''), r.value]))
      if (!bank.iban) throw orderError('Le paiement par virement est indisponible.', 503)
    }
    let payments = await db.prepare('SELECT * FROM payments WHERE reservation_id = ? ORDER BY installment_index').all(reservationId)
    if (payments.length && (payments.length !== tier || payments.some(p => p.method !== method))) throw orderError('Un paiement a déjà été préparé. Conservez le moyen de paiement et le nombre de versements déjà choisis.')
    if (!payments.length) {
      const eventDate = JSON.parse(order.dates || '[]')[0] || order.date
      const eligible = await getInstallmentTierEligibility(tier, order.grand_total, eventDate, new Date())
      if (!eligible.eligible) throw orderError(eligible.reason || 'Échéancier indisponible.', 400)
      if (method === 'card') {
        const customerId = await getOrCreateCustomer(order)
        await db.prepare('UPDATE reservations SET stripe_customer_id = ? WHERE id = ?').run(customerId, reservationId)
        order.stripe_customer_id = customerId
      }
      const schedule = computeInstallmentSchedule(order.grand_total, eventDate, tier, new Date())
      await db.writeTransaction(async tx => {
        for (const installment of schedule) await tx.prepare(`INSERT INTO payments
          (id, reservation_id, method, amount, installment_index, installment_label, due_date, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`)
          .run(crypto.randomUUID(), reservationId, method, installment.amount, installment.index, installment.label, installment.dueDate, new Date().toISOString())
        const utcMidnight = new Date(order.date + 'T00:00:00Z')
        const parisOffset = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(utcMidnight))
        const eventMidnight = utcMidnight.getTime() - parisOffset * 3600000
        const expiry = method === 'virement' && order.order_kind === 'rental'
          ? new Date(Math.min(Date.now() + 48 * 3600000, eventMidnight)).toISOString()
          : order.expires_at
        if (expiry && Date.parse(expiry) <= Date.now()) throw orderError('Le virement ne peut plus arriver avant cet événement. Choisissez la carte.')
        await tx.prepare('UPDATE reservations SET payment_method = ?, expires_at = ? WHERE id = ?').run(method, expiry, reservationId)
      })
      payments = await db.prepare('SELECT * FROM payments WHERE reservation_id = ? ORDER BY installment_index').all(reservationId)
    }
    const schedule = payments.map(p => ({ index: p.installment_index, label: p.installment_label, dueDate: p.due_date, amount: p.amount, status: p.status }))
    if (method === 'virement') {
      const updated = await db.prepare('SELECT expires_at FROM reservations WHERE id = ?').get(reservationId)
      return { bank, schedule, expiresAt: updated.expires_at }
    }
    const first = payments[0]
    const intent = first.stripe_payment_intent_id
      ? await getStripe().paymentIntents.retrieve(first.stripe_payment_intent_id)
      : await createFirstInstallmentIntent({ customerId: order.stripe_customer_id, amount: first.amount, reservationId, installmentId: first.id, needsFutureUsage: payments.length > 1 })
    await db.prepare('UPDATE payments SET stripe_payment_intent_id = ? WHERE id = ?').run(intent.id, first.id)
    if (intent.status === 'canceled') throw orderError('Ce paiement a expiré. Recommencez une commande.')
    return { clientSecret: intent.client_secret, schedule, billingDetails: { name: [order.prenom, order.nom].filter(Boolean).join(' '), email: order.email, phone: order.phone || undefined } }
  })
}

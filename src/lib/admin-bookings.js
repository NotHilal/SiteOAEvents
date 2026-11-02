import crypto from 'node:crypto'
import db, { generateReservationReference } from './db/index.js'
import { expireUnpaidOrders } from './orders.js'

// Server-only. Everything the admin (/admin) needs about bookings:
//
//   - kinds of reservations rows:
//       site   = paid online through Stripe (order_kind 'rental', src/lib/orders.js),
//                or a request left from the old booking flow (order_kind NULL);
//       manual = an order taken by phone / in person, paid outside Stripe;
//       block  = stock set aside without a full order ("24/12/2028 : 45 chaises").
//   - manual and block rows have status 'confirmed' while they hold stock
//     (ACTIVE), exactly like a paid online order — so src/lib/stock.js, the
//     public availability and the checkout count them with no special case.
//   - the planning: stock left per material per day.

const ACTIVE = ['confirmed', 'pending', 'awaiting_payment']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_DAYS = 120
const MAX_RANGE = 400

export const todayParis = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
export function bookingError(message, status = 400, extra = {}) { return Object.assign(new Error(message), { status, ...extra }) }

const parse = (value, fallback) => { try { return JSON.parse(value || '') ?? fallback } catch { return fallback } }
const money = value => Math.round((Number(value) || 0) * 100) / 100
const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '') || null

function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function expandRange(from, to) {
  if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '')) throw bookingError('Dates invalides.')
  if (to < from) throw bookingError('La date de fin est avant la date de début.')
  const days = []
  for (let d = from; d <= to; d = addDays(d, 1)) {
    days.push(d)
    if (days.length > MAX_DAYS) throw bookingError(`Période trop longue (maximum ${MAX_DAYS} jours).`)
  }
  return days
}

const rowDays = row => {
  const dates = parse(row.dates, [])
  return (dates.length ? dates : [row.date]).filter(d => DATE_RE.test(d || '')).sort()
}

const kindOf = row => (row.order_kind === 'manual' || row.order_kind === 'block' ? row.order_kind : 'site')

// One reservations row → what the admin screens show.
export function normalizeBooking(row, payments = []) {
  const days = rowDays(row)
  const kind = kindOf(row)
  const materials = parse(row.materials, []).map(m => ({
    id: String(m.id), name: m.name || 'Article', quantity: Number(m.quantity) || 0,
    price: m.price == null ? null : Number(m.price),
  }))
  let paymentStatus = row.payment_status || 'unpaid'
  let amountPaid = Number(row.amount_paid) || 0
  if (kind === 'site') {
    const paid = payments.filter(p => p.status === 'paid')
    // What the company keeps: paid payments, plus the rest of a partial refund.
    amountPaid = money(payments.reduce((s, p) => s + (p.status === 'paid' ? Number(p.amount || 0) : p.status === 'refunded' && p.refunded_amount != null ? Number(p.amount || 0) - Number(p.refunded_amount) : 0), 0))
    paymentStatus = payments.some(p => p.status === 'refunded') ? 'refunded'
      : paid.length ? 'paid'
      : row.status === 'awaiting_payment' ? 'pending' : 'unpaid'
  }
  if (kind === 'block') paymentStatus = 'none'
  const name = [row.prenom, row.nom].filter(Boolean).join(' ')
  return {
    id: row.id,
    reference: row.reference || null,
    kind,
    status: row.status,
    title: row.title || null,
    client: { firstName: row.prenom || '', lastName: row.nom || '', name: name || row.title || '', email: row.email || '', phone: row.phone || '' },
    address: row.delivery_address || '',
    days,
    from: days[0] || null,
    to: days[days.length - 1] || null,
    materials,
    quantity: materials.reduce((s, m) => s + m.quantity, 0),
    materialsTotal: row.materials_total == null ? null : Number(row.materials_total),
    deliveryFee: row.delivery_fee == null ? null : Number(row.delivery_fee),
    total: row.grand_total == null ? null : Number(row.grand_total),
    paymentStatus,
    amountPaid,
    notes: row.notes || '',
    eventType: row.event_type || '',
    nbPersons: row.nb_persons || null,
    message: row.message || '',
    accountId: row.account_id || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    active: ACTIVE.includes(row.status),
  }
}

async function paymentsByReservation() {
  const rows = await db.prepare('SELECT reservation_id, amount, status FROM payments').all()
  const map = {}
  for (const p of rows) (map[p.reservation_id] ||= []).push(p)
  return map
}

export async function listBookings() {
  await expireUnpaidOrders()
  const [rows, payments] = await Promise.all([
    db.prepare('SELECT * FROM reservations ORDER BY created_at DESC').all(),
    paymentsByReservation(),
  ])
  return rows.map(r => normalizeBooking(r, payments[r.id]))
}

export async function getBooking(id) {
  const row = await db.prepare('SELECT * FROM reservations WHERE id = ?').get(id)
  if (!row) throw bookingError('Commande introuvable. Rechargez la page.', 404)
  const payments = await db.prepare('SELECT * FROM payments WHERE reservation_id = ? ORDER BY installment_index').all(id)
  return { ...normalizeBooking(row, payments), payments: payments.map(p => ({ id: p.id, amount: Number(p.amount), status: p.status, method: p.method, paidAt: p.paid_at, refundedAt: p.refunded_at, refundedAmount: p.refunded_amount == null ? null : Number(p.refunded_amount) })) }
}

async function loadMaterials(q = db) {
  const rows = await q.prepare(`SELECT m.id, m.name, m.category, m.max_quantity, m.available, m.image_url, m.product_id,
      m.variant_label, m.variant_order, m.slug, p.name AS product_name
    FROM materials m LEFT JOIN products p ON p.id = m.product_id
    ORDER BY m.category, COALESCE(p.name, m.name), m.variant_order, m.name`).all()
  return rows.map(m => ({
    id: String(m.id), name: m.name, category: m.category || 'Autre', stock: Number(m.max_quantity) || 0,
    online: m.available === 1 || m.available === true, image: m.image_url || null,
    productId: m.product_id || null, productName: m.product_name || null, variantLabel: m.variant_label || null,
  }))
}

// { [day]: { [materialId]: quantity } } held by active reservations.
function usageOf(rows, from, to, excludeId) {
  const usage = {}
  for (const r of rows) {
    if (r.id === excludeId || !ACTIVE.includes(r.status)) continue
    const days = rowDays(r).filter(d => (!from || d >= from) && (!to || d <= to))
    if (!days.length) continue
    const materials = parse(r.materials, [])
    for (const day of days) {
      const slot = (usage[day] ||= {})
      for (const m of materials) slot[String(m.id)] = (slot[String(m.id)] || 0) + (Number(m.quantity) || 0)
    }
  }
  return usage
}

// Calendar / timeline data for [from, to].
export async function getPlanning(from, to) {
  if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '') || to < from) throw bookingError('Période invalide.')
  if ((new Date(to) - new Date(from)) / 86400000 > MAX_RANGE) throw bookingError('Période trop longue.')
  await expireUnpaidOrders()
  const [materials, rows, closures, payments] = await Promise.all([
    loadMaterials(),
    db.prepare(`SELECT * FROM reservations WHERE status IN (${ACTIVE.map(() => '?').join(',')})`).all(...ACTIVE),
    db.prepare('SELECT date, reason FROM blocked_dates WHERE date BETWEEN ? AND ? ORDER BY date').all(from, to),
    paymentsByReservation(),
  ])
  const events = rows
    .map(r => normalizeBooking(r, payments[r.id]))
    .filter(e => e.days.some(d => d >= from && d <= to))
    .sort((a, b) => (a.from || '').localeCompare(b.from || ''))
  return { from, to, today: todayParis(), materials, usage: usageOf(rows, from, to), events, closures }
}

// Overbooked days if `materials` were held on `days` (besides everything
// already booked, except reservation `excludeId`).
async function findConflicts(q, materials, days, excludeId) {
  const rows = await q.prepare(`SELECT id, status, date, dates, materials FROM reservations WHERE status IN (${ACTIVE.map(() => '?').join(',')})`).all(...ACTIVE)
  const usage = usageOf(rows, days[0], days[days.length - 1], excludeId)
  const stock = Object.fromEntries((await q.prepare(`SELECT id, name, max_quantity FROM materials WHERE id IN (${materials.map(() => '?').join(',')})`).all(...materials.map(m => m.id))).map(m => [String(m.id), m]))
  const conflicts = []
  for (const m of materials) {
    const owned = Number(stock[m.id]?.max_quantity) || 0
    let worst = null
    for (const day of days) {
      const used = usage[day]?.[m.id] || 0
      if (used + m.quantity > owned && (!worst || used > worst.used)) worst = { day, used }
    }
    if (worst) conflicts.push({ materialId: m.id, name: stock[m.id]?.name || m.name, stock: owned, used: worst.used, requested: m.quantity, available: Math.max(0, owned - worst.used), day: worst.day })
  }
  return conflicts
}

async function cleanMaterials(input, withPrices) {
  if (!Array.isArray(input) || !input.length) throw bookingError('Ajoutez au moins un article.')
  const merged = new Map()
  for (const item of input) {
    const id = String(item?.id || '')
    const quantity = Number(item?.quantity)
    if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000) throw bookingError('Quantité invalide : indiquez un nombre entier supérieur à 0.')
    const price = withPrices ? money(item.price) : null
    if (withPrices && (!Number.isFinite(Number(item.price)) || price < 0)) throw bookingError('Prix invalide sur un article.')
    const prev = merged.get(id)
    merged.set(id, { id, quantity: (prev?.quantity || 0) + quantity, price: price ?? prev?.price ?? null })
  }
  const list = [...merged.values()]
  const rows = await db.prepare(`SELECT id, name FROM materials WHERE id IN (${list.map(() => '?').join(',')})`).all(...list.map(m => m.id))
  const names = Object.fromEntries(rows.map(r => [String(r.id), r.name]))
  for (const m of list) {
    if (!names[m.id]) throw bookingError('Un article n’existe plus. Rechargez la page.', 409)
    m.name = names[m.id]
  }
  return list
}

// Creates (no id) or updates a block / manual order. Overbooking is refused
// with the details (error.conflicts) unless `force` — the team may have
// extra stock coming, it's their call.
export async function saveBooking(input = {}, { id = null, force = false } = {}) {
  const kind = input.kind
  if (!['block', 'manual'].includes(kind)) throw bookingError('Type invalide.')
  const days = Array.isArray(input.days) && input.days.length
    ? [...new Set(input.days)].filter(d => DATE_RE.test(d)).sort()
    : expandRange(input.from, input.to)
  if (!days.length || days.length > MAX_DAYS) throw bookingError('Dates invalides.')
  const materials = await cleanMaterials(input.materials, kind === 'manual')

  const record = {
    order_kind: kind,
    title: text(input.title, 120),
    notes: text(input.notes, 4000),
    date: days[0],
    dates: JSON.stringify(days),
    materials: JSON.stringify(materials.map(m => kind === 'manual' ? m : { id: m.id, name: m.name, quantity: m.quantity })),
    updated_at: new Date().toISOString(),
  }
  if (kind === 'block') {
    record.title ||= 'Blocage'
    Object.assign(record, { prenom: null, nom: null, email: '', phone: null, delivery_address: null, materials_total: null, delivery_fee: null, grand_total: null, payment_status: null, amount_paid: null })
  } else {
    const prenom = text(input.firstName, 80)
    const nom = text(input.lastName, 80)
    if (!prenom && !nom && !record.title) throw bookingError('Indiquez le nom du client.')
    const email = text(input.email, 254)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bookingError('Adresse e-mail invalide.')
    const deliveryFee = money(input.deliveryFee)
    if (deliveryFee < 0) throw bookingError('Frais de livraison invalides.')
    const materialsTotal = money(materials.reduce((s, m) => s + money(m.price) * m.quantity, 0))
    const paymentStatus = ['unpaid', 'deposit', 'paid'].includes(input.paymentStatus) ? input.paymentStatus : 'unpaid'
    const total = money(materialsTotal + deliveryFee)
    const amountPaid = paymentStatus === 'paid' ? total : paymentStatus === 'deposit' ? Math.min(total, Math.max(0, money(input.amountPaid))) : 0
    Object.assign(record, {
      prenom, nom, email: email || '', phone: text(input.phone, 30), delivery_address: text(input.address, 300),
      event_type: text(input.eventType, 60), materials_total: materialsTotal, delivery_fee: deliveryFee,
      grand_total: total, payment_status: paymentStatus, amount_paid: amountPaid, payment_method: 'manuel',
    })
  }

  return db.writeTransaction(async tx => {
    if (id) {
      const existing = await tx.prepare('SELECT id, order_kind, status FROM reservations WHERE id = ?').get(id)
      if (!existing) throw bookingError('Introuvable. Rechargez la page.', 404)
      if (!['block', 'manual'].includes(existing.order_kind)) throw bookingError('Les commandes payées en ligne ne se modifient pas ici.', 409)
    }
    if (!force) {
      const conflicts = await findConflicts(tx, materials, days, id)
      if (conflicts.length) throw bookingError('Stock insuffisant sur certaines dates.', 409, { conflicts })
    }
    if (id) {
      const keys = Object.keys(record)
      await tx.prepare(`UPDATE reservations SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map(k => record[k]), id)
      return id
    }
    const newId = crypto.randomUUID()
    const full = { ...record, id: newId, reference: await generateReservationReference(), status: 'confirmed', created_at: record.updated_at, rental_hours: '[]' }
    const keys = Object.keys(full)
    await tx.prepare(`INSERT INTO reservations (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map(k => full[k]))
    return newId
  }).then(getBooking)
}

// cancel / restore a manual order; record a payment; delete a block or manual order.
export async function updateBookingStatus(id, action, { force = false, amountPaid } = {}) {
  const row = await db.prepare('SELECT * FROM reservations WHERE id = ?').get(id)
  if (!row) throw bookingError('Introuvable. Rechargez la page.', 404)
  if (!['block', 'manual'].includes(row.order_kind)) throw bookingError('Action réservée aux commandes manuelles et aux blocages.', 409)
  const now = new Date().toISOString()
  if (action === 'delete') {
    await db.prepare('DELETE FROM reservations WHERE id = ?').run(id)
    return { deleted: true }
  }
  if (action === 'cancel') {
    await db.prepare("UPDATE reservations SET status = 'cancelled', updated_at = ? WHERE id = ?").run(now, id)
  } else if (action === 'restore') {
    if (!force) {
      const materials = parse(row.materials, []).map(m => ({ id: String(m.id), name: m.name, quantity: Number(m.quantity) || 0 }))
      const conflicts = await findConflicts(db, materials, rowDays(row), id)
      if (conflicts.length) throw bookingError('Stock insuffisant sur certaines dates.', 409, { conflicts })
    }
    await db.prepare("UPDATE reservations SET status = 'confirmed', updated_at = ? WHERE id = ?").run(now, id)
  } else if (action === 'payment') {
    if (row.order_kind !== 'manual') throw bookingError('Un blocage n’a pas de paiement.')
    const total = Number(row.grand_total) || 0
    const paid = Math.min(total, Math.max(0, money(amountPaid)))
    const status = paid <= 0 ? 'unpaid' : paid >= total ? 'paid' : 'deposit'
    await db.prepare('UPDATE reservations SET amount_paid = ?, payment_status = ?, updated_at = ? WHERE id = ?').run(paid, status, now, id)
  } else throw bookingError('Action inconnue.')
  return getBooking(id)
}

// Tableau de bord: what matters today and this week.
export async function getOverview() {
  const today = todayParis()
  const in7 = addDays(today, 7)
  const in30 = addDays(today, 30)
  const [bookings, unread, planning] = await Promise.all([
    listBookings(),
    db.prepare('SELECT COUNT(*) AS n FROM contacts WHERE read = false OR read IS NULL').get(),
    getPlanning(today, in30),
  ])
  const active = bookings.filter(b => b.active && b.from)
  const month = today.slice(0, 7)
  const revenue = bookings
    .filter(b => b.kind !== 'block' && b.status === 'confirmed' && (b.from || '').slice(0, 7) === month)
    .reduce((s, b) => s + (b.total || 0), 0)
  const collected = bookings
    .filter(b => b.kind !== 'block' && (b.from || '').slice(0, 7) === month && b.status !== 'cancelled')
    .reduce((s, b) => s + (b.amountPaid || 0), 0)

  // Days in the next 30 where a material is fully out (or overbooked).
  const shortages = []
  for (const m of planning.materials) {
    let first = null, worst = 0, count = 0
    for (const [day, slot] of Object.entries(planning.usage)) {
      const used = slot[m.id] || 0
      if (used >= m.stock && used > 0) { count++; if (!first || day < first) first = day; worst = Math.max(worst, used - m.stock) }
    }
    if (count) shortages.push({ materialId: m.id, name: m.name, stock: m.stock, firstDay: first, days: count, overbooked: worst })
  }
  shortages.sort((a, b) => a.firstDay.localeCompare(b.firstDay))

  return {
    today,
    deliveries: active.filter(b => b.from === today && b.kind !== 'block'),
    returns: active.filter(b => b.to === today || b.to === addDays(today, -1)).filter(b => b.kind !== 'block'),
    ongoing: active.filter(b => b.from < today && b.to > today && b.kind !== 'block'),
    upcoming: active.filter(b => b.from > today && b.from <= in7).sort((a, b) => a.from.localeCompare(b.from)),
    toCollect: bookings.filter(b => b.kind === 'manual' && b.status === 'confirmed' && b.paymentStatus !== 'paid' && (b.total || 0) > 0),
    awaitingPayment: bookings.filter(b => b.status === 'awaiting_payment').length,
    unreadMessages: Number(unread?.n) || 0,
    revenue: money(revenue),
    collected: money(collected),
    activeCount: active.filter(b => b.to >= today && b.kind !== 'block').length,
    shortages: shortages.slice(0, 8),
  }
}

// Clients page: accounts + everyone who ordered, with their orders.
export async function getClients() {
  const [accounts, bookings] = await Promise.all([
    db.prepare(`SELECT id, email, first_name, last_name, phone, account_type, company_name, active, last_login_at, created_at
      FROM customer_accounts ORDER BY created_at DESC`).all(),
    listBookings(),
  ])
  const byKey = new Map()
  const keyOf = email => String(email || '').trim().toLowerCase()
  for (const a of accounts) {
    byKey.set(keyOf(a.email), {
      key: keyOf(a.email), accountId: a.id, email: a.email, name: [a.first_name, a.last_name].filter(Boolean).join(' '),
      phone: a.phone || '', company: a.company_name || '', type: a.account_type === 'professionnel' ? 'pro' : 'particulier',
      hasAccount: true, createdAt: a.created_at, lastLoginAt: a.last_login_at, orders: [],
    })
  }
  for (const b of bookings) {
    if (b.kind === 'block' || b.status === 'expired') continue
    const key = keyOf(b.client.email) || `sans-email:${b.client.name.toLowerCase()}`
    if (!byKey.has(key)) byKey.set(key, { key, accountId: null, email: b.client.email, name: b.client.name, phone: b.client.phone, company: '', type: 'particulier', hasAccount: false, createdAt: b.createdAt, lastLoginAt: null, orders: [] })
    const c = byKey.get(key)
    if (!c.phone && b.client.phone) c.phone = b.client.phone
    if (!c.name && b.client.name) c.name = b.client.name
    c.orders.push({ id: b.id, reference: b.reference, kind: b.kind, status: b.status, from: b.from, to: b.to, total: b.total, paymentStatus: b.paymentStatus })
  }
  return [...byKey.values()].map(c => ({
    ...c,
    orderCount: c.orders.filter(o => o.status !== 'cancelled').length,
    totalSpent: money(c.orders.filter(o => o.status === 'confirmed').reduce((s, o) => s + (o.total || 0), 0)),
    lastOrder: c.orders.map(o => o.from).filter(Boolean).sort().at(-1) || null,
  })).sort((a, b) => (b.lastOrder || b.createdAt || '').localeCompare(a.lastOrder || a.createdAt || ''))
}

// Matériel > fiche: one material (or every option of its product), with
// stock history and the bookings holding it from today on.
export async function getMaterialDetail(id) {
  const material = await db.prepare('SELECT * FROM materials WHERE id = ?').get(id)
  if (!material) throw bookingError('Article introuvable.', 404)
  const product = material.product_id ? await db.prepare('SELECT * FROM products WHERE id = ?').get(material.product_id) : null
  const siblings = product
    ? await db.prepare('SELECT * FROM materials WHERE product_id = ? ORDER BY variant_order, name').all(product.id)
    : [material]
  const ids = siblings.map(m => String(m.id))
  const marks = ids.map(() => '?').join(',')
  const today = todayParis()
  const [tiers, movements, rows, payments] = await Promise.all([
    db.prepare(`SELECT * FROM material_price_tiers WHERE material_id IN (${marks}) ORDER BY min_qty`).all(...ids),
    db.prepare(`SELECT * FROM stock_movements WHERE material_id IN (${marks}) ORDER BY created_at DESC LIMIT 100`).all(...ids),
    db.prepare(`SELECT * FROM reservations WHERE status IN (${ACTIVE.map(() => '?').join(',')})`).all(...ACTIVE),
    paymentsByReservation(),
  ])
  const bookings = rows
    .map(r => normalizeBooking(r, payments[r.id]))
    .filter(b => b.to && b.to >= today && b.materials.some(m => ids.includes(m.id)))
    .sort((a, b) => a.from.localeCompare(b.from))
  return {
    product: product ? { id: product.id, name: product.name, description: product.description || '', category: product.category || '', slug: product.slug } : null,
    variants: siblings.map(m => ({
      id: String(m.id), name: m.name, label: m.variant_label || '', description: m.description || '', category: m.category || '',
      stock: Number(m.max_quantity) || 0, online: m.available === 1 || m.available === true, image: m.image_url || '',
      gallery: parse(m.gallery, []), slug: m.slug || '', productId: m.product_id || null, order: m.variant_order ?? 0,
      tiers: tiers.filter(t => String(t.material_id) === String(m.id)).map(t => ({ minQty: t.min_qty, maxQty: t.max_qty, weekday: Number(t.price_weekday_ht), weekend: Number(t.price_weekend_ht) })),
    })),
    selectedId: String(material.id),
    movements: movements.map(m => ({ id: m.id, materialId: String(m.material_id), delta: m.delta, stockAfter: m.stock_after, reason: m.reason || '', createdAt: m.created_at })),
    bookings,
    today,
  }
}

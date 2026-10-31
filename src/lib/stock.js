import crypto from 'node:crypto'
import db from './sqlite-db.js'
import { expireUnpaidOrders } from './orders.js'

// Server-only. Rental stock: materials.max_quantity is what OA owns; a day's
// availability is that minus what every active order holds on that day
// (several clients can rent the same item on the same day while combined
// quantities fit — same rule as the booking wizard and createRentalOrder).

const ACTIVE = "('confirmed', 'pending', 'awaiting_payment')"
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
export const todayParis = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })

const parse = (value, fallback) => { try { return JSON.parse(value || '') ?? fallback } catch { return fallback } }

// { [date]: { [materialId]: quantity } } for active orders on or after `from`.
async function usageByDay(from) {
  await expireUnpaidOrders()
  const rows = await db.prepare(`SELECT id, reference, date, dates, materials, status, prenom, nom FROM reservations WHERE status IN ${ACTIVE}`).all()
  const byDay = {}
  const orders = []
  for (const r of rows) {
    const dates = parse(r.dates, [])
    const days = (dates.length ? dates : [r.date]).filter(d => DATE_RE.test(d) && d >= from)
    if (!days.length) continue
    const materials = parse(r.materials, [])
    for (const day of days) {
      const slot = (byDay[day] ||= {})
      for (const m of materials) slot[String(m.id)] = (slot[String(m.id)] || 0) + (Number(m.quantity) || 0)
    }
    orders.push({ id: r.id, reference: r.reference, status: r.status, client: [r.prenom, r.nom].filter(Boolean).join(' '), days, materials })
  }
  return { byDay, orders }
}

// Available quantity per material over the given dates (the tightest day
// counts). Without dates: today.
export async function getAvailability(ids, dates) {
  const days = (dates?.length ? dates : [todayParis()]).filter(d => DATE_RE.test(d))
  if (!ids.length || !days.length) return {}
  const rows = await db.prepare(`SELECT id, max_quantity FROM materials WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids)
  const { byDay } = await usageByDay([...days].sort()[0])
  const out = {}
  for (const r of rows) {
    const peak = Math.max(0, ...days.map(d => byDay[d]?.[String(r.id)] || 0))
    out[String(r.id)] = { stock: Number(r.max_quantity) || 0, available: Math.max(0, (Number(r.max_quantity) || 0) - peak) }
  }
  return out
}

// Espace OA > Stock: every material with owned stock, what is out today,
// the busiest upcoming day and the upcoming orders holding it.
export async function getStockOverview() {
  const today = todayParis()
  const [materials, movements, { byDay, orders }] = await Promise.all([
    db.prepare('SELECT id, name, category, max_quantity, available, image_url, product_id, variant_order FROM materials ORDER BY category, name').all(),
    db.prepare('SELECT m.*, mat.name AS material_name FROM stock_movements m LEFT JOIN materials mat ON mat.id = m.material_id ORDER BY m.created_at DESC LIMIT 60').all(),
    usageByDay(today),
  ])
  return {
    today,
    items: materials.map(m => {
      const id = String(m.id)
      const stock = Number(m.max_quantity) || 0
      let peak = 0, peakDate = null
      for (const [day, slot] of Object.entries(byDay)) if ((slot[id] || 0) > peak) { peak = slot[id]; peakDate = day }
      const outToday = byDay[today]?.[id] || 0
      return {
        id, name: m.name, category: m.category || 'Autre', imageUrl: m.image_url || null,
        online: m.available === 1 || m.available === true,
        stock, outToday, availableToday: Math.max(0, stock - outToday), peak, peakDate,
        upcoming: orders
          .filter(o => o.materials.some(x => String(x.id) === id))
          .map(o => ({ reference: o.reference, status: o.status, client: o.client, from: o.days[0], to: o.days[o.days.length - 1], quantity: Number(o.materials.find(x => String(x.id) === id).quantity) || 0 }))
          .sort((a, b) => a.from.localeCompare(b.from)),
      }
    }),
    movements: movements.map(m => ({ id: m.id, materialId: m.material_id, materialName: m.material_name || 'Article supprimé', delta: m.delta, stockAfter: m.stock_after, reason: m.reason, createdAt: m.created_at })),
  }
}

export function stockError(message, status = 400) { return Object.assign(new Error(message), { status }) }

// Adds (delta > 0) or removes (delta < 0) owned units, logged. Removing below
// what upcoming orders already hold is refused: those orders must stay
// deliverable.
export async function adjustStock({ materialId, delta, reason }) {
  delta = Number(delta)
  if (typeof materialId !== 'string' || !materialId) throw stockError('Article invalide.')
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) throw stockError('Indiquez une quantité entière différente de 0.')
  const note = String(reason || '').trim().slice(0, 200) || null
  const material = await db.prepare('SELECT id, max_quantity FROM materials WHERE id = ?').get(materialId)
  if (!material) throw stockError('Article introuvable. Rechargez la page.', 404)
  const next = (Number(material.max_quantity) || 0) + delta
  if (next < 0) throw stockError('Le stock ne peut pas être négatif.')
  if (delta < 0) {
    const { byDay } = await usageByDay(todayParis())
    const committed = Math.max(0, ...Object.values(byDay).map(slot => slot[materialId] || 0))
    if (next < committed) throw stockError(`Impossible : ${committed} unité${committed > 1 ? 's sont déjà réservées' : ' est déjà réservée'} sur une date à venir. Stock minimum : ${committed}.`, 409)
  }
  // Conditional update: two simultaneous adjustments can't both apply on a stale value.
  const updated = await db.prepare('UPDATE materials SET max_quantity = ? WHERE id = ? AND COALESCE(max_quantity, 0) = ?').run(next, materialId, Number(material.max_quantity) || 0)
  if (!updated.changes) throw stockError('Le stock vient de changer. Rechargez et réessayez.', 409)
  const movement = { id: crypto.randomUUID(), material_id: materialId, delta, stock_after: next, reason: note, created_at: new Date().toISOString() }
  await db.prepare('INSERT INTO stock_movements (id, material_id, delta, stock_after, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(movement.id, movement.material_id, movement.delta, movement.stock_after, movement.reason, movement.created_at)
  return { stock: next, movement }
}

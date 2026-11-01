import db from './db/index.js'
import { clearCustomerCookie, getCustomerSession, isCurrentCustomerSession } from './customer-auth.js'
import { expireUnpaidOrders, flushOrderEmails } from './orders.js'

// Mon compte > Mes commandes: the orders placed while signed in to an
// account (reservations.account_id, set at checkout). Unpaid baskets that
// expired are left out — like any shop, only real orders are listed.

// The signed-in customer, or null. Passing `res` also clears a stale cookie.
export async function getCurrentCustomer(req, res) {
  const session = getCustomerSession(req)
  if (!session) return null
  const account = await db.prepare('SELECT * FROM customer_accounts WHERE id = ?').get(session.sub)
  if (isCurrentCustomerSession(session, account)) return account
  if (res) clearCustomerCookie(res)
  return null
}

const parse = value => { try { return JSON.parse(value || '[]') || [] } catch { return [] } }

async function toPublicOrders(rows) {
  const ids = [...new Set(rows.flatMap(row => parse(row.materials).map(m => String(m.id))))]
  const catalogue = ids.length
    ? await db.prepare(`SELECT id, slug, image_url FROM materials WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids)
    : []
  const byId = Object.fromEntries(catalogue.map(m => [String(m.id), m]))
  return rows.map(row => {
    const dates = parse(row.dates)
    return {
      reference: row.reference,
      status: row.status,
      created_at: row.created_at,
      dates: dates.length ? dates : [row.date],
      items: parse(row.materials).map(m => ({
        id: String(m.id),
        name: m.name,
        quantity: Number(m.quantity),
        price: m.price ?? null,
        image: byId[String(m.id)]?.image_url || null,
        slug: byId[String(m.id)]?.slug || null,
      })),
      delivery_address: row.delivery_address,
      distance_km: row.distance_km,
      delivery_fee: row.delivery_fee,
      materials_total: row.materials_total,
      grand_total: row.grand_total,
      message: row.message,
      contact: { prenom: row.prenom, nom: row.nom, email: row.email, phone: row.phone },
    }
  })
}

export async function listCustomerOrders(accountId) {
  await expireUnpaidOrders()
  await flushOrderEmails()
  const rows = await db.prepare(`
    SELECT * FROM reservations
    WHERE account_id = ? AND status <> 'expired'
    ORDER BY created_at DESC
  `).all(accountId)
  return toPublicOrders(rows)
}

export async function getCustomerOrder(accountId, reference) {
  await expireUnpaidOrders()
  const row = await db.prepare('SELECT * FROM reservations WHERE account_id = ? AND upper(reference) = upper(?)').get(accountId, reference)
  if (!row) return null
  return (await toPublicOrders([row]))[0]
}

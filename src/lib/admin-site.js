import crypto from 'node:crypto'
import db from './db/index.js'
import { deleteUploadIfUnused } from './admin-catalog.js'
import { getStripeConfig, saveStripeConfig, testStripeKeys } from './stripe.js'
import { SITE_URL } from './site.js'

// Server-only. /admin: page content, contact messages, closed days and
// Réglages (delivery, rentals, Stripe).

export function siteError(message, status = 400) { return Object.assign(new Error(message), { status }) }

// Editable page content (site_content). Values are JSON except max_consecutive_days.
const CONTENT_KEYS = ['about_page', 'images_home', 'images_contact', 'home_categories_style', 'images_galerie']

export async function getContent(key) {
  if (!CONTENT_KEYS.includes(key)) throw siteError('Contenu inconnu.', 404)
  const row = await db.prepare('SELECT value FROM site_content WHERE key = ?').get(key)
  return { key, value: row?.value ?? null }
}

export async function setContent(key, value) {
  if (!CONTENT_KEYS.includes(key)) throw siteError('Contenu inconnu.', 404)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw siteError('Contenu invalide.')
  const json = JSON.stringify(value)
  if (json.length > 200000) throw siteError('Contenu trop volumineux.')
  const before = await db.prepare('SELECT value FROM site_content WHERE key = ?').get(key)
  await db.prepare('INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, now()) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now()').run(key, json)
  // Photos replaced in this content are deleted once unused.
  const old = String(before?.value || '').match(/\/uploads\/[a-zA-Z0-9_./-]+/g) || []
  for (const url of new Set(old)) if (!json.includes(url)) await deleteUploadIfUnused(url)
  return { ok: true }
}

// Contact messages.
export async function listMessages() {
  return db.prepare('SELECT id, prenom, nom, name, email, telephone, phone, type_evenement, subject, message, read, created_at FROM contacts ORDER BY created_at DESC').all()
}
export async function unreadMessages() {
  return (await db.prepare('SELECT COUNT(*) AS n FROM contacts WHERE read = false').get()).n
}
export async function setMessageRead(id, read) {
  await db.prepare('UPDATE contacts SET read = ? WHERE id = ?').run(!!read, String(id))
  return { ok: true }
}
export async function deleteMessage(id) {
  await db.prepare('DELETE FROM contacts WHERE id = ?').run(String(id))
  return { ok: true }
}

// Days closed to online orders.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
export async function closeDay(date, reason) {
  if (!DATE_RE.test(date || '')) throw siteError('Date invalide.')
  await db.prepare('INSERT INTO blocked_dates (id, date, reason) VALUES (?, ?, ?) ON CONFLICT (date) DO UPDATE SET reason = excluded.reason')
    .run(crypto.randomUUID(), date, (typeof reason === 'string' && reason.trim().slice(0, 200)) || null)
  return { ok: true }
}
export async function reopenDay(date) {
  if (!DATE_RE.test(date || '')) throw siteError('Date invalide.')
  await db.prepare('DELETE FROM blocked_dates WHERE date = ?').run(date)
  await db.prepare('DELETE FROM blocked_hours WHERE date = ?').run(date)
  return { ok: true }
}

// Réglages.
export async function getSettings() {
  const [rows, max, stripe] = await Promise.all([
    db.prepare("SELECT key, value FROM settings WHERE key IN ('depot_address', 'delivery_base_fee', 'delivery_per_km')").all(),
    db.prepare("SELECT value FROM site_content WHERE key = 'max_consecutive_days'").get(),
    getStripeConfig(),
  ])
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
  const mask = v => (v ? `${v.slice(0, 8)}…${v.slice(-4)}` : '')
  return {
    depotAddress: map.depot_address || '',
    deliveryBaseFee: Number(map.delivery_base_fee) || 0,
    deliveryPerKm: Number(map.delivery_per_km) || 0,
    maxConsecutiveDays: Number(max?.value) || 7,
    stripe: {
      source: stripe.source,
      live: stripe.live,
      publishableKey: stripe.publishableKey,
      secretKey: mask(stripe.secretKey),
      webhookSecret: mask(stripe.webhookSecret),
      webhookUrl: `${SITE_URL}/api/payments/webhook`,
      webhookEvents: ['payment_intent.succeeded', 'payment_intent.payment_failed', 'charge.refunded'],
    },
  }
}

export async function saveSettings({ depotAddress, deliveryBaseFee, deliveryPerKm, maxConsecutiveDays }) {
  const depot = typeof depotAddress === 'string' ? depotAddress.trim().slice(0, 300) : ''
  const base = Number(deliveryBaseFee)
  const perKm = Number(deliveryPerKm)
  const maxDays = Number.parseInt(maxConsecutiveDays, 10)
  if (!depot) throw siteError("L'adresse du dépôt est obligatoire.")
  if (!(base >= 0) || !(perKm >= 0)) throw siteError('Frais de livraison invalides.')
  if (!(maxDays >= 1 && maxDays <= 30)) throw siteError('Durée maximale : entre 1 et 30 jours.')
  await db.writeTransaction(async tx => {
    const up = 'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, now()) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now()'
    await tx.prepare(up).run('depot_address', depot)
    await tx.prepare(up).run('delivery_base_fee', String(base))
    await tx.prepare(up).run('delivery_per_km', String(perKm))
    await tx.prepare("INSERT INTO site_content (key, value, updated_at) VALUES ('max_consecutive_days', ?, now()) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now()").run(String(maxDays))
  })
  return getSettings()
}

// Stripe keys: tested against Stripe before being saved.
export async function saveStripe({ publishableKey, secretKey, webhookSecret }) {
  const pk = typeof publishableKey === 'string' ? publishableKey.trim() : ''
  const sk = typeof secretKey === 'string' ? secretKey.trim() : ''
  const wh = typeof webhookSecret === 'string' ? webhookSecret.trim() : ''
  if (wh && !wh.startsWith('whsec_')) throw siteError('Le secret du webhook doit commencer par whsec_.')
  const current = await getStripeConfig()
  const test = await testStripeKeys({ publishableKey: pk || current.publishableKey, secretKey: sk || current.secretKey })
  if ((pk || sk) && !test.ok) throw siteError(test.problems.join(' '))
  await saveStripeConfig({ publishableKey: pk, secretKey: sk, webhookSecret: wh })
  return { ...(await getSettings()).stripe, account: test.account || null }
}

export async function testStripe() {
  const c = await getStripeConfig()
  if (!c.secretKey) return { ok: false, problems: ['Aucune clé secrète enregistrée.'] }
  return { ...(await testStripeKeys(c)), webhook: !!c.webhookSecret }
}

export async function removeStripe() {
  await saveStripeConfig({ publishableKey: null, secretKey: null, webhookSecret: null })
  return (await getSettings()).stripe
}

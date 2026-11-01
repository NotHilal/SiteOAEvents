import crypto from 'node:crypto'
import db from './db/index.js'
import { slugify } from './slug.js'
import { categoryKeyFromTitle, normalizeCategoryTitle } from './catalogue-pages.js'
import { todayParis } from './admin-bookings.js'

// Server-only. /admin > Matériel and Site > Catalogue: every write to the
// catalogue (articles, options, prices, categories), validated here and run
// in a transaction — the browser never writes tables directly.

export function catalogError(message, status = 400) { return Object.assign(new Error(message), { status }) }

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null
const isUpload = url => typeof url === 'string' && /^\/uploads\/[a-zA-Z0-9_./-]+$/.test(url)
const imageUrl = v => (v == null || v === '' ? null : typeof v === 'string' && (isUpload(v) || /^\/(pics|catalogue|catalogue_images)\//.test(v) || /^https:\/\//.test(v)) ? v.slice(0, 500) : (() => { throw catalogError('Photo invalide.') })())
const optionName = (name, label) => `${String(name).trim()} ${String(label || '').trim()}`.trim()

export async function getCatalog() {
  const [materials, products, tiers, categories] = await Promise.all([
    db.prepare('SELECT * FROM materials ORDER BY name').all(),
    db.prepare('SELECT * FROM products ORDER BY name').all(),
    db.prepare('SELECT * FROM material_price_tiers ORDER BY material_id, min_qty').all(),
    db.prepare('SELECT * FROM categories ORDER BY position NULLS LAST, created_at').all(),
  ])
  return { materials, products, tiers, categories }
}

// URL slug unique across materials AND products (product slugs win on /catalogue/[slug]).
async function uniqueSlug(q, name, fallback) {
  const base = slugify(name) || slugify(fallback) || 'article'
  const rows = await q.prepare('SELECT slug FROM materials WHERE slug = ? OR slug LIKE ? UNION SELECT slug FROM products WHERE slug = ? OR slug LIKE ?').all(base, `${base}-%`, base, `${base}-%`)
  const used = new Set(rows.map(r => r.slug))
  let slug = base
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`
  return slug
}

// Active orders / blocks from today on that hold one of these materials.
async function upcomingHolds(q, ids) {
  const rows = await q.prepare("SELECT dates, date, materials FROM reservations WHERE status IN ('confirmed', 'pending', 'awaiting_payment')").all()
  const today = todayParis()
  let n = 0
  for (const r of rows) {
    let dates = []
    let mats = []
    try { dates = JSON.parse(r.dates || '[]') } catch {}
    try { mats = JSON.parse(r.materials || '[]') } catch {}
    const last = (dates.length ? dates : [r.date]).sort().at(-1)
    if (last >= today && mats.some(m => ids.includes(String(m.id)))) n++
  }
  return n
}

// Deletes an uploaded file once nothing references it any more.
export async function deleteUploadIfUnused(url, q = db) {
  if (!isUpload(url)) return
  const like = `%${url}%`
  const used = await q.prepare(`SELECT 1 FROM materials WHERE image_url = ? OR gallery::text LIKE ?
    UNION SELECT 1 FROM categories WHERE image_url = ? UNION SELECT 1 FROM site_content WHERE value LIKE ? LIMIT 1`).get(url, like, url, like)
  if (!used) await q.prepare('DELETE FROM files WHERE path = ?').run(url.slice('/uploads/'.length).split('?')[0])
}

function cleanTiers(input) {
  if (!Array.isArray(input) || !input.length || input.length > 20) throw catalogError('Au moins un prix est requis.')
  const tiers = input.map(t => ({
    minQty: Number.parseInt(t.minQty, 10),
    maxQty: t.maxQty == null || t.maxQty === '' ? null : Number.parseInt(t.maxQty, 10),
    weekday: Number(t.weekday),
    weekend: Number(t.weekend),
  })).sort((a, b) => a.minQty - b.minQty)
  for (const t of tiers) {
    if (!Number.isInteger(t.minQty) || t.minQty < 1) throw catalogError('Quantité minimale invalide.')
    if (t.maxQty != null && (!Number.isInteger(t.maxQty) || t.maxQty < t.minQty)) throw catalogError('La quantité maximale doit être supérieure ou égale au minimum.')
    if (!Number.isFinite(t.weekday) || t.weekday < 0 || !Number.isFinite(t.weekend) || t.weekend < 0) throw catalogError('Prix invalide.')
  }
  return tiers
}

async function writeTiers(q, materialId, tiers) {
  await q.prepare('DELETE FROM material_price_tiers WHERE material_id = ?').run(materialId)
  for (const [i, t] of tiers.entries()) {
    await q.prepare('INSERT INTO material_price_tiers (id, material_id, min_qty, max_qty, price_weekday_ht, price_weekend_ht, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), materialId, t.minQty, t.maxQty, t.weekday, t.weekend, i)
  }
}

const stockOf = v => {
  const n = Number.parseInt(v, 10)
  if (!Number.isInteger(n) || n < 0 || n > 1000000) throw catalogError('Stock invalide.')
  return n
}

// "Nouvel article": created offline, with one price for any quantity (HT).
export async function createMaterial({ name, category, stock, priceHt }) {
  const n = text(name, 150)
  if (!n) throw catalogError('Le nom est obligatoire.')
  const ht = Number(priceHt)
  if (!Number.isFinite(ht) || ht < 0) throw catalogError('Prix invalide.')
  return db.writeTransaction(async tx => {
    const id = crypto.randomUUID()
    await tx.prepare('INSERT INTO materials (id, name, category, max_quantity, available, slug) VALUES (?, ?, ?, ?, false, ?)')
      .run(id, n, text(category, 80), stockOf(stock), await uniqueSlug(tx, n, id))
    await writeTiers(tx, id, [{ minQty: 1, maxQty: null, weekday: ht, weekend: ht }])
    return { id }
  })
}

export async function setTiers({ materialId, tiers }) {
  const clean = cleanTiers(tiers)
  await db.writeTransaction(async tx => {
    if (!(await tx.prepare('SELECT 1 FROM materials WHERE id = ?').get(materialId))) throw catalogError('Article introuvable.', 404)
    await writeTiers(tx, materialId, clean)
  })
  return { ok: true }
}

// Fiche produit: shared fields (name, category, description — on the product
// for an article à options) + this option's label, photos and online state.
export async function updateArticle({ materialId, name, category, description, label, image, gallery, online }) {
  const n = text(name, 150)
  if (!n) throw catalogError('Le nom est obligatoire.')
  const photos = Array.isArray(gallery) ? gallery.slice(0, 40).map(imageUrl).filter(Boolean) : []
  const main = imageUrl(image)
  let previous = null
  await db.writeTransaction(async tx => {
    const m = await tx.prepare('SELECT * FROM materials WHERE id = ?').get(materialId)
    if (!m) throw catalogError('Article introuvable.', 404)
    previous = m.image_url
    const own = { image_url: main, gallery: JSON.stringify(photos), available: !!online }
    if (m.product_id) {
      const l = text(label, 80)
      if (!l) throw catalogError("Le libellé de l'option est obligatoire.")
      await tx.prepare('UPDATE products SET name = ?, category = ?, description = ? WHERE id = ?').run(n, text(category, 80), text(description, 5000), m.product_id)
      const siblings = await tx.prepare('SELECT id, variant_label FROM materials WHERE product_id = ?').all(m.product_id)
      for (const s of siblings) {
        const sl = s.id === m.id ? l : s.variant_label
        await tx.prepare('UPDATE materials SET name = ?, category = ? WHERE id = ?').run(optionName(n, sl), text(category, 80), s.id)
      }
      await tx.prepare('UPDATE materials SET variant_label = ?, image_url = ?, gallery = ?, available = ? WHERE id = ?').run(l, own.image_url, own.gallery, own.available, m.id)
    } else {
      await tx.prepare('UPDATE materials SET name = ?, category = ?, description = ?, image_url = ?, gallery = ?, available = ? WHERE id = ?')
        .run(n, text(category, 80), text(description, 5000), own.image_url, own.gallery, own.available, m.id)
    }
  })
  if (previous && previous !== main) await deleteUploadIfUnused(previous)
  return { ok: true }
}

// New option: on a simple article it first becomes an article à options
// (its web address moves to the product, so shared links keep working).
// The new option copies the current prices and starts offline.
export async function addOption({ materialId, currentLabel, label, stock }) {
  const l = text(label, 80)
  if (!l) throw catalogError('Indiquez le libellé de la nouvelle option.')
  return db.writeTransaction(async tx => {
    const m = await tx.prepare('SELECT * FROM materials WHERE id = ?').get(materialId)
    if (!m) throw catalogError('Article introuvable.', 404)
    let productId = m.product_id
    let baseName = m.name
    if (!productId) {
      const cur = text(currentLabel, 80)
      if (!cur) throw catalogError('Indiquez le libellé de la version actuelle.')
      if (cur.toLowerCase() === l.toLowerCase()) throw catalogError('Les deux options doivent avoir des libellés différents.')
      productId = crypto.randomUUID()
      const slug = m.slug || await uniqueSlug(tx, m.name, productId)
      await tx.prepare('UPDATE materials SET slug = NULL WHERE id = ?').run(m.id)
      await tx.prepare('INSERT INTO products (id, slug, name, description, category) VALUES (?, ?, ?, ?, ?)').run(productId, slug, m.name, m.description, m.category)
      await tx.prepare('UPDATE materials SET product_id = ?, variant_label = ?, variant_order = 1, name = ?, slug = ? WHERE id = ?')
        .run(productId, cur, optionName(m.name, cur), await uniqueSlug(tx, optionName(m.name, cur), m.id), m.id)
    } else {
      const p = await tx.prepare('SELECT name FROM products WHERE id = ?').get(productId)
      baseName = p?.name || m.name
      const taken = await tx.prepare('SELECT 1 FROM materials WHERE product_id = ? AND lower(variant_label) = lower(?)').get(productId, l)
      if (taken) throw catalogError('Une option porte déjà ce libellé.')
    }
    const { max } = await tx.prepare('SELECT COALESCE(MAX(variant_order), 0) AS max FROM materials WHERE product_id = ?').get(productId)
    const id = crypto.randomUUID()
    const name = optionName(baseName, l)
    await tx.prepare('INSERT INTO materials (id, name, category, product_id, variant_label, variant_order, max_quantity, available, slug) VALUES (?, ?, ?, ?, ?, ?, ?, false, ?)')
      .run(id, name, m.category, productId, l, Number(max) + 1, stockOf(stock), await uniqueSlug(tx, name, id))
    const tiers = await tx.prepare('SELECT * FROM material_price_tiers WHERE material_id = ? ORDER BY min_qty').all(m.id)
    await writeTiers(tx, id, tiers.map(t => ({ minQty: t.min_qty, maxQty: t.max_qty, weekday: t.price_weekday_ht, weekend: t.price_weekend_ht })))
    return { id }
  })
}

// Removes one option. With only one left, the article becomes simple again
// and takes back the product's web address.
export async function deleteOption({ materialId }) {
  const removed = await db.writeTransaction(async tx => {
    const m = await tx.prepare('SELECT * FROM materials WHERE id = ?').get(materialId)
    if (!m?.product_id) throw catalogError('Option introuvable.', 404)
    const held = await upcomingHolds(tx, [m.id])
    if (held) throw catalogError(`Impossible : cette option est réservée dans ${held} commande(s) à venir.`, 409)
    const product = await tx.prepare('SELECT * FROM products WHERE id = ?').get(m.product_id)
    await tx.prepare('DELETE FROM materials WHERE id = ?').run(m.id)
    const rest = await tx.prepare('SELECT * FROM materials WHERE product_id = ? ORDER BY variant_order').all(m.product_id)
    let keepId = rest[0]?.id || null
    if (rest.length === 1) {
      const keep = rest[0]
      await tx.prepare('DELETE FROM products WHERE id = ?').run(product.id)
      await tx.prepare('UPDATE materials SET product_id = NULL, variant_label = NULL, variant_order = NULL, name = ?, description = COALESCE(description, ?), slug = ? WHERE id = ?')
        .run(product.name, product.description, product.slug, keep.id)
      keepId = keep.id
    }
    return { image: m.image_url, keepId }
  })
  await deleteUploadIfUnused(removed.image)
  return { keepId: removed.keepId }
}

// Deletes an article (and every option). Refused while it is booked.
export async function deleteArticle({ materialId }) {
  const images = await db.writeTransaction(async tx => {
    const m = await tx.prepare('SELECT * FROM materials WHERE id = ?').get(materialId)
    if (!m) throw catalogError('Article introuvable.', 404)
    const all = m.product_id ? await tx.prepare('SELECT id, image_url FROM materials WHERE product_id = ?').all(m.product_id) : [m]
    const held = await upcomingHolds(tx, all.map(x => x.id))
    if (held) throw catalogError(`Impossible : l'article est réservé dans ${held} commande(s) à venir. Mettez-le plutôt hors ligne.`, 409)
    for (const x of all) await tx.prepare('DELETE FROM materials WHERE id = ?').run(x.id)
    if (m.product_id) await tx.prepare('DELETE FROM products WHERE id = ?').run(m.product_id)
    return all.map(x => x.image_url)
  })
  for (const url of images) await deleteUploadIfUnused(url)
  return { ok: true }
}

// Site > Catalogue: category tiles.
export async function saveCategory({ id, title, description, image }) {
  const label = String(title || '').replace(/\s+/g, ' ').trim().slice(0, 60)
  if (!label) throw catalogError('Le titre est obligatoire.')
  const desc = text(description, 220)
  if (!desc) throw catalogError('La description est obligatoire.')
  const img = imageUrl(image)
  if (!img) throw catalogError('La photo est obligatoire.')
  const name = categoryKeyFromTitle(label)
  let previous = null
  const result = await db.writeTransaction(async tx => {
    const all = await tx.prepare('SELECT id, name, label, image_url, position FROM categories').all()
    const wanted = normalizeCategoryTitle(label)
    if (all.some(c => c.id !== id && [c.name, c.label].filter(Boolean).map(normalizeCategoryTitle).includes(wanted))) throw catalogError('Ce titre est déjà utilisé par une autre catégorie.', 409)
    if (id) {
      const cur = all.find(c => c.id === id)
      if (!cur) throw catalogError('Catégorie introuvable.', 404)
      previous = cur.image_url
      await tx.prepare('UPDATE categories SET name = ?, label = ?, description = ?, image_url = ? WHERE id = ?').run(name, label, desc, img, id)
      if (name !== cur.name) {
        await tx.prepare('UPDATE materials SET category = ? WHERE category = ?').run(name, cur.name)
        await tx.prepare('UPDATE products SET category = ? WHERE category = ?').run(name, cur.name)
      }
      return { id }
    }
    const newId = crypto.randomUUID()
    const position = all.reduce((max, c) => Math.max(max, c.position ?? -1), -1) + 1
    await tx.prepare('INSERT INTO categories (id, name, label, description, image_url, position) VALUES (?, ?, ?, ?, ?, ?)').run(newId, name, label, desc, img, position)
    return { id: newId }
  })
  if (previous && previous !== img) await deleteUploadIfUnused(previous)
  return result
}

export async function deleteCategory({ id }) {
  const image = await db.writeTransaction(async tx => {
    const c = await tx.prepare('SELECT * FROM categories WHERE id = ?').get(id)
    if (!c) throw catalogError('Catégorie introuvable.', 404)
    const { n } = await tx.prepare('SELECT COUNT(*) AS n FROM materials WHERE category = ?').get(c.name)
    if (n) throw catalogError(`Cette catégorie contient encore ${n} article(s) : changez-les de catégorie avant de la supprimer.`, 409)
    await tx.prepare('DELETE FROM categories WHERE id = ?').run(id)
    const rest = await tx.prepare('SELECT id FROM categories ORDER BY position NULLS LAST, created_at').all()
    for (const [i, r] of rest.entries()) await tx.prepare('UPDATE categories SET position = ? WHERE id = ?').run(i, r.id)
    return c.image_url
  })
  await deleteUploadIfUnused(image)
  return { ok: true }
}

export async function reorderCategories({ ids }) {
  if (!Array.isArray(ids)) throw catalogError('Ordre invalide.')
  await db.writeTransaction(async tx => {
    for (const [i, id] of ids.entries()) await tx.prepare('UPDATE categories SET position = ? WHERE id = ?').run(i, String(id))
  })
  return { ok: true }
}

export const CATALOG_ACTIONS = { createMaterial, setTiers, updateArticle, addOption, deleteOption, deleteArticle, saveCategory, deleteCategory, reorderCategories }

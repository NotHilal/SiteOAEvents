import db from './sqlite-db.js'
import { slugify } from './slug.js'

// Server-only (imported from getServerSideProps): resolves a /catalogue/[slug]
// URL to a product and its variants. See the products table comment in
// sqlite-db.js for the model.
//
// The slug can be:
//   - a product's slug (/catalogue/poids-de-lestage) → that product;
//   - a variant's own slug (/catalogue/poids-de-lestage-30-kg) → its product,
//     with that variant preselected — so a catalogue card always links to
//     exactly the item it shows;
//   - a standalone material's slug → a single-option product.
// Returns null when nothing matches (→ 404).

const RELATED_LIMIT = 4

function toMaterial(row) {
  return {
    id: String(row.id),
    slug: row.slug || slugify(row.name),
    name: row.name,
    description: row.description || null,
    category: row.category || null,
    imageUrl: row.image_url || null,
    available: row.available === 1 || row.available === true,
    maxQuantity: row.max_quantity || null,
    variantLabel: row.variant_label || null,
  }
}

async function findMaterialBySlug(slug) {
  const row = await db.prepare('SELECT * FROM materials WHERE slug = ?').get(slug)
  if (row) return row
  // Items created in Espace OA since the last server start have no stored
  // slug yet — match them on their name instead.
  const rows = await db.prepare("SELECT * FROM materials WHERE slug IS NULL OR slug = ''").all()
  return rows.find(r => slugify(r.name) === slug) || null
}

async function tiersFor(materialIds) {
  if (!materialIds.length) return {}
  const rows = await db.prepare(
    `SELECT material_id, min_qty, max_qty, price_weekday_ht, price_weekend_ht FROM material_price_tiers
     WHERE material_id IN (${materialIds.map(() => '?').join(',')}) ORDER BY min_qty`
  ).all(...materialIds)
  const map = {}
  for (const t of rows) {
    const key = String(t.material_id)
    ;(map[key] ||= []).push({
      min_qty: t.min_qty, max_qty: t.max_qty ?? null,
      price_weekday_ht: t.price_weekday_ht, price_weekend_ht: t.price_weekend_ht,
    })
  }
  return map
}

// Other products from the same category, one card per product (a family
// shows once, under its own name and first available picture).
async function relatedProducts(category, excludeIds) {
  if (!category) return []
  const rows = await db.prepare(
    `SELECT m.*, p.slug AS product_slug, p.name AS product_name FROM materials m
     LEFT JOIN products p ON p.id = m.product_id
     WHERE m.category = ? AND m.available = 1 ORDER BY m.variant_order, m.name`
  ).all(category)
  const seen = new Set()
  const out = []
  for (const r of rows) {
    if (excludeIds.includes(String(r.id))) continue
    const key = r.product_id || `m:${r.id}`
    if (seen.has(key)) {
      // Fill in a picture from a later variant if the first one had none.
      const card = out.find(c => c.key === key)
      if (card && !card.imageUrl && r.image_url) card.imageUrl = r.image_url
      continue
    }
    seen.add(key)
    out.push({
      key,
      slug: r.product_slug || r.slug || slugify(r.name),
      name: r.product_name || r.name,
      imageUrl: r.image_url || null,
    })
  }
  // Sliced only at the end: a family's picture may come from a variant
  // listed after the fourth card.
  return out.slice(0, RELATED_LIMIT)
}

export async function getCatalogueProduct(slug) {
  let productRow = await db.prepare('SELECT * FROM products WHERE slug = ?').get(slug)
  let activeVariantId = null
  let standalone = null

  if (!productRow) {
    const material = await findMaterialBySlug(slug)
    if (!material) return null
    if (material.product_id) {
      productRow = await db.prepare('SELECT * FROM products WHERE id = ?').get(material.product_id)
      activeVariantId = String(material.id)
    }
    if (!productRow) standalone = material
  }

  const variantRows = standalone
    ? [standalone]
    : await db.prepare('SELECT * FROM materials WHERE product_id = ? ORDER BY variant_order, name').all(productRow.id)
  if (!variantRows.length) return null

  const variants = variantRows.map(toMaterial)
  const tiers = await tiersFor(variants.map(v => v.id))
  const category = productRow?.category || variants[0].category

  return {
    product: {
      id: productRow ? productRow.id : `m:${standalone.id}`,
      // Canonical URL: the product's slug, even when reached via a
      // variant's slug.
      slug: productRow ? productRow.slug : variants[0].slug,
      name: productRow ? productRow.name : variants[0].name,
      description: productRow?.description || null,
      category,
    },
    variants: variants.map(v => ({ ...v, tiers: tiers[v.id] || [] })),
    activeVariantId,
    related: await relatedProducts(category, variants.map(v => v.id)),
  }
}

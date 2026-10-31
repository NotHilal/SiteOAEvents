import db from './sqlite-db.js'
import { slugify } from './slug.js'
import { getMinOrderQty, getUnitPriceTtc } from './pricing.js'
import { sortCategories } from './catalogue-pages.js'

// Server-only: one card per product for the catalogue listing, the homepage
// selection and the quick view. A simple article is its own card; the
// options of an article à options fold into one card under the product's
// name. Each variant carries everything the quick view needs (photos,
// price, minimum, stock) so it opens without another request.

export const parseGallery = value => {
  try {
    const list = JSON.parse(value || '[]')
    return Array.isArray(list) ? list.filter(u => typeof u === 'string' && u) : []
  } catch { return [] }
}

// Main photo first, then the extra ones, without duplicates.
export const imagesOf = m => [...new Set([m.image_url, ...parseGallery(m.gallery)].filter(Boolean))]

export async function getCatalogueCards() {
  const [materials, products, categoryRows, tierRows] = await Promise.all([
    db.prepare('SELECT * FROM materials WHERE available = 1 ORDER BY variant_order, name').all(),
    db.prepare('SELECT id, slug, name, category, description FROM products').all(),
    db.prepare('SELECT id, name, label, description, image_url, position, created_at FROM categories').all(),
    db.prepare('SELECT material_id, min_qty, max_qty, price_weekday_ht, price_weekend_ht FROM material_price_tiers ORDER BY min_qty').all(),
  ])
  const categories = sortCategories(categoryRows)
  const tiers = {}
  for (const t of tierRows) (tiers[String(t.material_id)] ||= []).push({
    min_qty: t.min_qty, max_qty: t.max_qty ?? null,
    price_weekday_ht: t.price_weekday_ht, price_weekend_ht: t.price_weekend_ht,
  })

  const productById = Object.fromEntries(products.map(p => [String(p.id), p]))
  const cards = []
  const byProduct = {}
  for (const m of materials) {
    const minQty = getMinOrderQty(tiers[String(m.id)])
    const variant = {
      id: String(m.id),
      name: m.name,
      label: m.variant_label || m.name,
      slug: m.slug || slugify(m.name),
      imageUrl: m.image_url || null,
      images: imagesOf(m),
      description: m.description || '',
      minQty,
      maxQty: m.max_quantity || null,
      price: getUnitPriceTtc(tiers[String(m.id)], 'weekday', minQty),
      weekendPrice: getUnitPriceTtc(tiers[String(m.id)], 'weekend', minQty),
    }
    const product = m.product_id && productById[String(m.product_id)]
    if (!product) {
      cards.push({ key: `m:${m.id}`, name: m.name, category: m.category || 'Autre', slug: variant.slug, description: m.description || '', variants: [variant] })
      continue
    }
    if (!byProduct[product.id]) {
      byProduct[product.id] = { key: `p:${product.id}`, name: product.name, category: product.category || m.category || 'Autre', slug: product.slug, description: product.description || '', variants: [] }
      cards.push(byProduct[product.id])
    }
    byProduct[product.id].variants.push(variant)
  }

  // Catalogue order: categories in their tile order.
  const rank = Object.fromEntries(categories.map((c, i) => [c.name, i]))
  cards.sort((a, b) => (rank[a.category] ?? 1e9) - (rank[b.category] ?? 1e9))

  return { cards: cards.map(finishCard), categories }
}

function finishCard(card) {
  const prices = card.variants.map(v => v.price).filter(p => p > 0)
  const images = [...new Set(card.variants.flatMap(v => v.images))]
  return {
    ...card,
    imageUrl: images[0] || null,
    hoverImageUrl: images[1] || null,
    fromPrice: prices.length ? Math.min(...prices) : 0,
    stock: card.variants.reduce((n, v) => n + (v.maxQty || 0), 0),
  }
}

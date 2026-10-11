// Pure helpers behind the Espace OA article editor (MaterialEditor.jsx):
// pricing form <-> material_price_tiers rows, validation, and the material
// rows an article saves to. No React, no network — kept separate so the
// rules are easy to read and to test.
//
// Model (see the products table in src/lib/sqlite-db.js):
//   - "Article simple"    = one material, product_id NULL.
//   - "Article à options" = one product + one material per option, each
//     with its own price tiers, stock, photo and availability. An option's
//     name is the article name + its label ("Poids de lestage" + "15 kg"),
//     which is what the cart, booking wizard and orders display.

export const EMPTY_TIER = { minQty: 1, maxQty: '', weekday: '', weekend: '' }

export const emptyPricing = () => ({ tieredPricing: false, weekendDiffers: true, tiers: [{ ...EMPTY_TIER }] })

// material_price_tiers rows (sorted by min_qty) → the pricing form.
export function pricingFromTiers(rows) {
  const tiers = rows && rows.length
    ? rows.map(t => ({ minQty: t.min_qty, maxQty: t.max_qty ?? '', weekday: t.price_weekday_ht, weekend: t.price_weekend_ht }))
    : [{ ...EMPTY_TIER }]
  return {
    tieredPricing: tiers.length > 1,
    weekendDiffers: rows && rows.length ? tiers.some(t => parseFloat(t.weekday) !== parseFloat(t.weekend)) : true,
    tiers,
  }
}

// Pricing form → tiers to save, or an error message. The two toggles are
// the only source of truth: tiers collapse to one 1..∞ band when "paliers"
// is off, and the weekend price mirrors the weekday one when "tarif
// différent le week-end" is off, whatever stale values sit in the form.
export function parsePricing(pricing) {
  const tiers = pricing.tiers.map(t => {
    const weekday = parseFloat(String(t.weekday).replace(',', '.'))
    const weekend = pricing.weekendDiffers ? parseFloat(String(t.weekend).replace(',', '.')) : weekday
    return {
      minQty: pricing.tieredPricing ? parseInt(String(t.minQty), 10) : 1,
      maxQty: pricing.tieredPricing ? (t.maxQty === '' || t.maxQty == null ? null : parseInt(String(t.maxQty), 10)) : null,
      weekday, weekend,
    }
  })
  if (!tiers.length) return { error: 'Au moins un palier de prix est requis.' }
  for (const t of tiers) {
    if (!t.minQty || t.minQty < 1) return { error: 'Quantité minimale invalide sur un palier.' }
    if (t.maxQty != null && t.maxQty < t.minQty) return { error: 'Quantité maximale doit être supérieure ou égale au minimum.' }
    if (isNaN(t.weekday) || t.weekday < 0 || isNaN(t.weekend) || t.weekend < 0) return { error: 'Veuillez entrer des prix valides (≥ 0).' }
  }
  return { tiers }
}

export const tierRowsFor = (materialId, tiers) => tiers.map(t => ({
  material_id: materialId, min_qty: t.minQty, max_qty: t.maxQty, price_weekday_ht: t.weekday, price_weekend_ht: t.weekend,
}))

export const isValidStock = qty => /^\d+$/.test(String(qty).trim()) && parseInt(String(qty), 10) >= 1

export const optionName = (articleName, label) => `${articleName.trim()} ${label.trim()}`.trim()

let keySeq = 0
export const newOptionKey = () => `opt-${Date.now().toString(36)}-${keySeq++}`

export function emptyOption() {
  return { key: newOptionKey(), id: null, label: '', qty: 1, description: '', available: true, pricing: emptyPricing(), imageUrl: '', imageFile: null, imagePreview: null, open: true }
}

// Validates the whole article. Returns { ok: true } or the first problem
// as { tab, message, optionKey? } so the editor can jump to it.
export function validateArticle(form) {
  if (!form.name.trim()) return { tab: 'infos', message: 'Le nom est obligatoire.' }
  if (form.kind === 'single') {
    if (!isValidStock(form.qty)) return { tab: 'infos', message: 'Veuillez entrer un stock entier valide (≥ 1).' }
    const { error } = parsePricing(form.pricing)
    if (error) return { tab: 'tarification', message: error }
    return { ok: true }
  }
  if (form.options.length < 2) {
    return { tab: 'options', message: 'Un article à options doit en proposer au moins deux. Avec une seule version, choisissez « Article simple ».' }
  }
  const seen = new Set()
  for (const [i, o] of form.options.entries()) {
    const where = `Option ${i + 1}${o.label.trim() ? ` (« ${o.label.trim()} »)` : ''}`
    if (!o.label.trim()) return { tab: 'options', optionKey: o.key, message: `${where} : le libellé est obligatoire (ex : 15 kg, 5 mètres, Beige).` }
    const k = o.label.trim().toLowerCase()
    if (seen.has(k)) return { tab: 'options', optionKey: o.key, message: `${where} : deux options ont le même libellé.` }
    seen.add(k)
    if (!isValidStock(o.qty)) return { tab: 'options', optionKey: o.key, message: `${where} : stock entier valide requis (≥ 1).` }
    const { error } = parsePricing(o.pricing)
    if (error) return { tab: 'options', optionKey: o.key, message: `${where} : ${error}` }
  }
  return { ok: true }
}

// Lowest weekday unit price HT across tiers (for list summaries).
export function startingHt(tierRows) {
  if (!tierRows || !tierRows.length) return null
  return Math.min(...tierRows.map(t => Number(t.price_weekday_ht)))
}

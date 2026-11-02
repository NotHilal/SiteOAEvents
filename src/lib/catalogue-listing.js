import { getCatalogueCards } from './catalogue-cards.js'
import { CATALOGUE_SORTS, categoryTitle } from './catalogue-pages.js'
import { slugify } from './slug.js'

// Server-only: props of a catalogue listing, for every article
// (/catalogue/complet) or one category (/location/<slug>). Returns null for a
// category slug that matches nothing.
export async function getCatalogueListing({ categorySlug, tri }) {
  const { cards, categories } = await getCatalogueCards()

  // A category row, or a value only found on articles (no row in `categories`).
  const orphan = categorySlug && cards.find(c => slugify(c.category) === categorySlug)
  const category = categorySlug
    ? categories.find(c => slugify(c.name) === categorySlug) || (orphan ? { name: orphan.category } : null)
    : null
  if (categorySlug && !category) return null

  const counts = {}
  for (const c of cards) counts[c.category] = (counts[c.category] || 0) + 1
  const chips = categories.filter(c => counts[c.name]).map(c => ({ key: c.name, label: categoryTitle(c), count: counts[c.name] }))

  const sort = CATALOGUE_SORTS.some(s => s.key === tri) ? String(tri) : ''
  const filtered = category ? cards.filter(c => c.category === category.name) : [...cards]
  const price = c => c.fromPrice || Infinity
  if (sort === 'prix') filtered.sort((a, b) => price(a) - price(b))
  if (sort === 'prix-desc') filtered.sort((a, b) => (b.fromPrice || 0) - (a.fromPrice || 0))
  if (sort === 'nom') filtered.sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  return {
    cards: filtered,
    allTotal: cards.length,
    sort,
    chips,
    categoryKey: category?.name || null,
    title: category ? categoryTitle(category) : 'Tout le catalogue',
    intro: category?.description || '',
  }
}

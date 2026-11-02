import { getCatalogueCards } from '../catalogue-cards.js'

// Server-only: the catalogue cards of a landing page, in its chosen order.
// A product removed in the admin simply drops out of the page.
export async function featuredCards(slugs = []) {
  const { cards } = await getCatalogueCards()
  return slugs.map(slug => cards.find(c => c.slug === slug)).filter(Boolean)
}

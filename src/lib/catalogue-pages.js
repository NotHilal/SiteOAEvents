// Catalogue category helpers, shared by the public /catalogue page (every
// tile on one page, in position order) and Espace OA > Catalogue.

// The tile's title: its label, or the stored uppercase name for a category
// created before titles existed ("OPTIONS & ACCESSOIRES" → "Options & accessoires").
export function categoryTitle(category) {
  if (category.label) return category.label
  const name = String(category.name || '').toLocaleLowerCase('fr')
  return name.charAt(0).toLocaleUpperCase('fr') + name.slice(1)
}

// Compare titles ignoring case, accents and extra spaces, so "Decorations"
// counts as taken when "Décorations" exists.
export const normalizeCategoryTitle = title =>
  String(title || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase()

// Stored key (materials.category): the title in capitals, accents kept, like
// the existing BANQUETTES / DÉCORATIONS.
export const categoryKeyFromTitle = title => String(title || '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('fr')

export const sortCategories = categories =>
  [...categories].sort((a, b) => (a.position ?? 1e9) - (b.position ?? 1e9) || String(a.created_at || '').localeCompare(String(b.created_at || '')) || String(a.name).localeCompare(String(b.name)))

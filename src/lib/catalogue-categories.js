import db from './db/index.js'
import { categoryTitle, sortCategories } from './catalogue-pages.js'

// One source for the homepage, catalogue and public category navigation.
// Read on each request so CMS edits are visible without a rebuild.
export async function getCatalogueCategories() {
  const rows = await db.prepare('SELECT id, name, label, description, image_url, position, created_at FROM categories').all()
  return sortCategories(rows).map(c => ({
    id: String(c.id),
    name: c.name,
    label: categoryTitle(c),
    description: c.description || '',
    image_url: c.image_url || null,
    position: c.position ?? null,
  }))
}

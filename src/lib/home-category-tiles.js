import db from './db/index.js'
import { getCatalogueCategories } from './catalogue-categories.js'
import { defaultHomeCategoryTiles } from './catalogue-pages.js'

export const HOME_TILES_KEY = 'home_category_tiles'

// Defaults mirror the original five-tile home mosaic, with tents replacing
// decorations. Saved layouts reference category IDs, so renaming is safe.
export async function getHomeCategoryTiles(categories) {
  categories ||= await getCatalogueCategories()
  const row = await db.prepare('SELECT value FROM site_content WHERE key = ?').get(HOME_TILES_KEY)
  let layout = null
  try { layout = JSON.parse(row?.value || 'null') } catch {}
  let tiles = layout?.tiles
  if (!Array.isArray(tiles)) {
    tiles = defaultHomeCategoryTiles(categories)
  }
  return tiles.flatMap(tile => {
    const category = categories.find(c => c.id === tile.categoryId)
    return category ? [{ ...category, categoryId: category.id, title: tile.title || null, label: tile.title || category.label }] : []
  })
}

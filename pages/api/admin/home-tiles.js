import { adminRoute } from '../../../src/lib/admin-api.js'
import { getCatalogueCategories } from '../../../src/lib/catalogue-categories.js'
import { getHomeCategoryTiles } from '../../../src/lib/home-category-tiles.js'

export default adminRoute(['GET'], async () => {
  const categories = await getCatalogueCategories()
  return { categories, tiles: await getHomeCategoryTiles(categories) }
}, 'admin/home-tiles')

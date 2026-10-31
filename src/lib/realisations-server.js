import db from './sqlite-db.js'
import { REALISATION_PREFIX, validateRealisation } from './realisations.js'

export async function getRealisations() {
  const rows = await db.prepare('SELECT key, value, updated_at FROM site_content WHERE key LIKE ? ORDER BY updated_at DESC, key').all(`${REALISATION_PREFIX}%`)
  return rows.flatMap(row => {
    try {
      return [{ ...validateRealisation(JSON.parse(row.value)), id: row.key.slice(REALISATION_PREFIX.length), updatedAt: row.updated_at }]
    } catch {
      // Ignore malformed editorial rows; never substitute illustrative content.
      return []
    }
  })
}

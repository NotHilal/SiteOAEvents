import crypto from 'crypto'
import db from '../../src/lib/sqlite-db.js'
import { isAuthorized } from '../../src/lib/auth.js'
import { REALISATION_PREFIX, validateRealisation } from '../../src/lib/realisations.js'
import { getRealisations } from '../../src/lib/realisations-server.js'

export default async function handler(req, res) {
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, PUT, DELETE')
    return res.status(405).end()
  }
  if (req.method !== 'GET' && !isAuthorized(req)) return res.status(401).json({ message: 'Connexion administrateur requise.' })
  try {
    if (req.method === 'GET') return res.json({ data: await getRealisations() })
    const id = req.method === 'POST' ? crypto.randomUUID() : req.body?.id
    if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(id)) return res.status(400).json({ message: 'Identifiant invalide.' })
    const key = `${REALISATION_PREFIX}${id}`
    if (req.method !== 'POST' && !await db.prepare('SELECT key FROM site_content WHERE key = ?').get(key)) return res.status(404).json({ message: 'Réalisation introuvable. Rechargez la liste.' })
    if (req.method === 'DELETE') {
      // Media can be reused: removing a fiche must not break another one.
      await db.prepare('DELETE FROM site_content WHERE key = ?').run(key)
      return res.json({ data: { id } })
    }
    let item
    try { item = validateRealisation(req.body) } catch (error) { return res.status(400).json({ message: error.message }) }
    const now = new Date().toISOString()
    // Check and write in one statement to reject simultaneous slug collisions.
    const result = await db.prepare(`INSERT INTO site_content (key, value, updated_at)
      SELECT ?, ?, ? WHERE NOT EXISTS (
        SELECT 1 FROM site_content WHERE key LIKE ? AND key != ?
        AND json_extract(CASE WHEN json_valid(value) THEN value ELSE '{}' END, '$.slug') = ?
      ) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
      .run(key, JSON.stringify(item), now, `${REALISATION_PREFIX}%`, key, item.slug)
    if (!result.changes) return res.status(409).json({ message: 'Cette adresse existe déjà. Choisissez une autre adresse.' })
    return res.status(req.method === 'POST' ? 201 : 200).json({ data: { ...item, id, updatedAt: now } })
  } catch (error) {
    console.error('[realisations]', error)
    return res.status(500).json({ message: 'Enregistrement indisponible. Réessayez dans quelques instants.' })
  }
}

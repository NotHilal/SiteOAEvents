import db from '../../src/lib/db/index.js'

// Public page content (site_content), read by the public pages.
//   GET /api/content?key=about_page → { value }
// Only these keys are public; everything else stays admin-only.
export const PUBLIC_CONTENT_KEYS = ['about_page', 'images_home', 'images_contact', 'home_categories_style', 'images_galerie', 'max_consecutive_days']

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end() }
  const key = String(req.query.key || '')
  if (!PUBLIC_CONTENT_KEYS.includes(key)) return res.status(404).json({ message: 'Contenu introuvable.' })
  try {
    const row = await db.prepare('SELECT value FROM site_content WHERE key = ?').get(key)
    return res.json({ data: { value: row?.value ?? null } })
  } catch (error) {
    console.error('[content]', error)
    return res.status(500).json({ message: 'Contenu indisponible.' })
  }
}

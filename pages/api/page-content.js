import { getPageContent } from '../../src/lib/cms/server.js'
import { CMS_PAGE_IDS } from '../../src/lib/cms/schema.js'

// Public, resolved page content (what the site displays).
//   GET /api/page-content?page=global → { data: { … } }
export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end() }
  const page = String(req.query.page || '')
  if (!CMS_PAGE_IDS.includes(page)) return res.status(404).json({ message: 'Contenu introuvable.' })
  return res.json({ data: await getPageContent(page) })
}

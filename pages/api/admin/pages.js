import { adminRoute } from '../../../src/lib/admin-api.js'
import { getPageContent, getPageMeta, savePageContent } from '../../../src/lib/cms/server.js'

// /admin > Contenu des pages: GET ?page= · PUT { page, content }
export default adminRoute(['GET', 'PUT'], async req => {
  if (req.method === 'GET') {
    const page = String(req.query.page || '')
    return { content: await getPageContent(page), ...(await getPageMeta(page)) }
  }
  return savePageContent(String(req.body?.page || ''), req.body?.content)
}, 'admin/pages')

import { adminRoute } from '../../../src/lib/admin-api.js'
import { getContent, setContent } from '../../../src/lib/admin-site.js'

// /admin > Site: GET ?key= · PUT { key, value }
export default adminRoute(['GET', 'PUT'], req =>
  req.method === 'GET' ? getContent(String(req.query.key || '')) : setContent(String(req.body?.key || ''), req.body?.value), 'admin/content')

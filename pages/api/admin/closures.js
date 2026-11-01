import { adminRoute } from '../../../src/lib/admin-api.js'
import { closeDay, reopenDay } from '../../../src/lib/admin-site.js'

// /admin > Calendrier > Fermeture: POST { date, reason } · DELETE { date }
export default adminRoute(['POST', 'DELETE'], req =>
  req.method === 'POST' ? closeDay(req.body?.date, req.body?.reason) : reopenDay(req.body?.date), 'admin/closures')

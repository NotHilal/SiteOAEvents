import { adminRoute } from '../../../src/lib/admin-api.js'
import { getPlanning } from '../../../src/lib/admin-bookings.js'

// /admin > Calendrier: GET ?from=YYYY-MM-DD&to=YYYY-MM-DD
export default adminRoute(['GET'], req => getPlanning(String(req.query.from || ''), String(req.query.to || '')), 'admin/planning')

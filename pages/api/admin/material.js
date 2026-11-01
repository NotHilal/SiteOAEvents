import { adminRoute } from '../../../src/lib/admin-api.js'
import { getMaterialDetail } from '../../../src/lib/admin-bookings.js'

// /admin > Matériel > fiche: GET ?id=<material id>
export default adminRoute(['GET'], req => getMaterialDetail(String(req.query.id || '')), 'admin/material')

import { adminRoute } from '../../../src/lib/admin-api.js'
import { getOverview } from '../../../src/lib/admin-bookings.js'

// /admin > Tableau de bord.
export default adminRoute(['GET'], () => getOverview(), 'admin/overview')

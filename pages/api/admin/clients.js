import { adminRoute } from '../../../src/lib/admin-api.js'
import { getClients } from '../../../src/lib/admin-bookings.js'

// /admin > Clients: accounts and everyone who ordered, with their orders.
export default adminRoute(['GET'], () => getClients(), 'admin/clients')

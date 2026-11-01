import { adminRoute } from '../../../src/lib/admin-api.js'
import { getBooking, listBookings, saveBooking, updateBookingStatus } from '../../../src/lib/admin-bookings.js'

// /admin > Commandes and the booking dialog.
//   GET                → every order / block
//   GET ?id=           → one, with its payments
//   POST  { ...booking, force? }       → new block or manual order
//   PUT   { id, ...booking, force? }   → update a block / manual order
//   PATCH { id, action: cancel|restore|payment|delete, amountPaid?, force? }
export default adminRoute(['GET', 'POST', 'PUT', 'PATCH'], async req => {
  const body = req.body || {}
  if (req.method === 'GET') return typeof req.query.id === 'string' ? getBooking(req.query.id) : listBookings()
  if (req.method === 'POST') return saveBooking(body, { force: body.force === true })
  if (typeof body.id !== 'string') throw Object.assign(new Error('Identifiant manquant.'), { status: 400 })
  if (req.method === 'PUT') return saveBooking(body, { id: body.id, force: body.force === true })
  return updateBookingStatus(body.id, body.action, { force: body.force === true, amountPaid: body.amountPaid })
}, 'admin/bookings')

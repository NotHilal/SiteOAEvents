import { clearCustomerCookie } from '../../../src/lib/customer-auth.js'

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' })
  clearCustomerCookie(res)
  return res.status(200).json({ success: true })
}

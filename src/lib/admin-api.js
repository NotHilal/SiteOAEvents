import { isAuthorized } from './auth.js'

// Wraps an /api/admin/* handler: admin token required, allowed methods,
// errors with a status (bookingError, stockError…) answered as JSON.
export function adminRoute(methods, handler, label = 'admin') {
  return async function route(req, res) {
    if (!methods.includes(req.method)) { res.setHeader('Allow', methods.join(', ')); return res.status(405).end() }
    if (!isAuthorized(req)) return res.status(401).json({ message: 'Connexion administrateur requise.' })
    try {
      const data = await handler(req, res)
      if (!res.headersSent) res.json({ data })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message, ...(error.conflicts ? { conflicts: error.conflicts } : {}) })
      console.error(`[${label}]`, error)
      return res.status(500).json({ message: 'Une erreur est survenue. Réessayez dans quelques instants.' })
    }
  }
}

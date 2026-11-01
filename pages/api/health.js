import db from '../../src/lib/db/index.js'

// Container health check (Dockerfile HEALTHCHECK): the app answers and PostgreSQL is reachable.
export default async function handler(req, res) {
  try {
    await db.prepare('SELECT 1').get()
    return res.status(200).json({ ok: true })
  } catch {
    return res.status(503).json({ ok: false })
  }
}

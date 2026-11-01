import db from '../../src/lib/db/index.js'

// Checkout calendar rules: days closed to online orders (Calendrier >
// Fermeture, plus legacy hour blocks) and the longest rental allowed.
export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end() }
  try {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
    const [days, hours, max] = await Promise.all([
      db.prepare('SELECT date FROM blocked_dates WHERE date >= ?').all(today),
      db.prepare('SELECT DISTINCT date FROM blocked_hours WHERE date >= ?').all(today),
      db.prepare("SELECT value FROM site_content WHERE key = 'max_consecutive_days'").get(),
    ])
    const n = Number.parseInt(max?.value, 10)
    return res.json({ data: { closedDates: [...new Set([...days, ...hours].map(r => r.date))], maxConsecutiveDays: n > 0 ? n : 7 } })
  } catch (error) {
    console.error('[booking-config]', error)
    return res.status(500).json({ message: 'Calendrier indisponible.' })
  }
}

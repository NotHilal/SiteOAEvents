// Browser helpers for the public site's data routes (pages/api/content,
// contact, catalogue/*, booking-config). Each read resolves to a safe
// fallback instead of throwing, so a page always renders.

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()).data
}

// site_content value (raw text — usually JSON) or null.
export async function getContent(key) {
  try { return (await getJson(`/api/content?key=${encodeURIComponent(key)}`))?.value ?? null } catch { return null }
}

// Parsed JSON content, or `fallback`.
export async function getJsonContent(key, fallback = null) {
  const raw = await getContent(key)
  if (raw == null) return fallback
  try { return JSON.parse(raw) } catch { return fallback }
}

export async function getCategories() {
  try { return (await getJson('/api/catalogue/categories')) || [] } catch { return [] }
}

// { materials: [...], tiers: [...] } for the given material ids.
export async function getCatalogueItems(ids) {
  if (!ids.length) return { materials: [], tiers: [] }
  try { return await getJson(`/api/catalogue/items?ids=${ids.map(encodeURIComponent).join(',')}`) } catch { return { materials: [], tiers: [] } }
}

// { closedDates: ['YYYY-MM-DD'], maxConsecutiveDays }
export async function getBookingConfig() {
  try { return await getJson('/api/booking-config') } catch { return { closedDates: [], maxConsecutiveDays: 7 } }
}

// Contact form. Throws an Error with .status on refusal (400 invalid, 429 too many).
export async function sendContact(payload) {
  const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error(data.message || 'Envoi impossible.'), { status: res.status })
  }
}

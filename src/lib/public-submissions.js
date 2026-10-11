import db from './sqlite-db.js';
import { getDayType, getUnitPriceTtc, groupTiersByMaterial } from './pricing.js';
import { computeDeliveryQuote } from './geo.js';

// Server-side gate for the two tables anonymous visitors may insert into
// (reservations, contacts) through /api/db. Before this, the endpoint
// accepted ANY column from the browser — a visitor could set their own
// status or grand_total (which /api/payments then charges), or send
// `__upsert` + an existing id to overwrite someone else's reservation.
//
// Each sanitizer returns { record } or { error }, building the row only
// from an allowlist and recomputing everything price-related server-side.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function str(v, max) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

export function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email.trim());
}

// Honeypot: the forms render a visually hidden "website" field humans never
// see. Bots that fill every input trip it.
export function isSpam(item) {
  return !!(item && typeof item.website === 'string' && item.website.trim());
}

export async function sanitizeContact(item) {
  const email = str(item.email, 254);
  const message = str(item.message, 5000);
  if (!email || !isValidEmail(email)) return { error: 'Adresse email invalide.' };
  if (!message || message.length < 2) return { error: 'Message manquant.' };
  return {
    record: {
      prenom: str(item.prenom, 80),
      nom: str(item.nom, 80),
      email,
      telephone: str(item.telephone, 30),
      type_evenement: str(item.type_evenement, 60),
      message,
      read: 0,
    },
  };
}

export async function sanitizeReservation(item) {
  const email = str(item.email, 254);
  if (!email || !isValidEmail(email)) return { error: 'Adresse email invalide.' };

  const dates = (Array.isArray(item.dates) ? item.dates : [item.date])
    .filter(d => typeof d === 'string' && DATE_RE.test(d))
    .slice(0, 31)
    .sort();
  if (!dates.length) return { error: 'Date manquante.' };
  const today = new Date().toISOString().slice(0, 10);
  if (dates[0] < today) return { error: 'La date choisie est déjà passée.' };

  const nb = parseInt(item.nb_persons, 10);

  // Materials: only id + quantity are trusted from the client. Names and
  // unit prices come from the database, priced exactly like the booking
  // wizard does (whole-event rate from the first day's day type).
  const requested = (Array.isArray(item.materials) ? item.materials : [])
    .map(m => ({ id: String(m?.id ?? ''), quantity: parseInt(m?.quantity, 10) }))
    .filter(m => m.id && Number.isFinite(m.quantity) && m.quantity > 0 && m.quantity <= 100000)
    .slice(0, 200);

  let materials = [];
  let materialsTotal = 0;
  if (requested.length) {
    const ids = [...new Set(requested.map(m => m.id))];
    const placeholders = ids.map(() => '?').join(',');
    const rows = await db.prepare(`SELECT id, name FROM materials WHERE id IN (${placeholders})`).all(...ids);
    const tierRows = await db.prepare(`SELECT * FROM material_price_tiers WHERE material_id IN (${placeholders})`).all(...ids);
    const tiersByMaterial = groupTiersByMaterial(tierRows);
    const byId = new Map(rows.map(r => [String(r.id), r]));
    const dayType = getDayType(dates[0]);
    for (const m of requested) {
      const row = byId.get(m.id);
      if (!row) continue;
      const price = getUnitPriceTtc(tiersByMaterial[m.id], dayType, m.quantity);
      materials.push({ id: m.id, name: row.name, quantity: m.quantity, price });
      materialsTotal += price * m.quantity;
    }
  }
  materialsTotal = Math.round(materialsTotal * 100) / 100;

  // Delivery: recomputed from the address. If geocoding fails the request
  // still goes through (the team can quote delivery by hand) — it's just
  // stored without a delivery fee rather than with a client-supplied one.
  const address = str(item.delivery_address, 300);
  let quote = null;
  if (address) {
    try { quote = await computeDeliveryQuote(address); } catch { quote = null; }
  }
  const grandTotal = Math.round((materialsTotal + (quote?.fee || 0)) * 100) / 100;

  return {
    record: {
      prenom: str(item.prenom, 80),
      nom: str(item.nom, 80),
      email,
      phone: str(item.phone, 30),
      date: dates[0],
      dates,
      event_type: str(item.event_type, 60),
      nb_persons: Number.isFinite(nb) && nb > 0 && nb < 100000 ? nb : null,
      materials,
      message: str(item.message, 5000),
      status: 'pending',
      delivery_address: address,
      distance_km: quote?.distanceKm ?? null,
      delivery_fee: quote?.fee ?? null,
      quote_base_fee: quote?.baseFee ?? null,
      quote_per_km: quote?.perKm ?? null,
      materials_total: materialsTotal,
      grand_total: grandTotal,
    },
  };
}

export const PUBLIC_SANITIZERS = {
  reservations: sanitizeReservation,
  contacts: sanitizeContact,
};

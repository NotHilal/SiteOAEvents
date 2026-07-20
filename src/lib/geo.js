// Geocodage (Nominatim/OpenStreetMap) + distance routière (OSRM) — services publics gratuits, sans clé API.
import db from './sqlite-db.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const USER_AGENT = 'OA-Evenementiel-Website/1.0 (contact@oa-evenementiel.fr)';
// Base Adresse Nationale (data.gouv.fr) — the French government's own address
// API, purpose-built for autocomplete. Nominatim's `display_name` is a
// reverse-geocoding label (admin hierarchy, quartier, "France métropolitaine"…)
// and reads as garbled noise for a French street address; BAN returns the
// clean "72 Rue Victor Basch 92120 Montrouge" form people actually expect.
const BAN_URL = 'https://api-adresse.data.gouv.fr/search/';

function getSetting(key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row && row.value != null ? row.value : fallback;
}

// Keyed by address string (not a single cached value) so editing the depot
// address in the admin "Réglages" tab is picked up on the next quote
// instead of serving a stale geocode from before the change.
const depotCoordsCache = new Map();

export async function geocodeAddress(address) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error('Le service de géocodage est indisponible.');
  const data = await res.json();
  if (!data.length) throw new Error("Adresse introuvable. Vérifiez l'adresse saisie.");
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

async function getDrivingDistanceKm(origin, dest) {
  const url = `${OSRM_URL}/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Le service d'itinéraire est indisponible.");
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('Itinéraire introuvable pour cette adresse.');
  const route = data.routes[0];
  return { distanceKm: route.distance / 1000, durationMin: route.duration / 60 };
}

async function getDepotCoords() {
  const address = getSetting('depot_address', '72 rue Victor Basch, 92120 Montrouge, France');
  if (depotCoordsCache.has(address)) return depotCoordsCache.get(address);
  const coords = await geocodeAddress(address);
  depotCoordsCache.set(address, coords);
  return coords;
}

export async function suggestAddresses(query) {
  const url = `${BAN_URL}?q=${encodeURIComponent(query)}&limit=5&autocomplete=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Le service de géocodage est indisponible.');
  const data = await res.json();
  return (data.features || []).map(f => ({
    label: f.properties.label,
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
  }));
}

export async function computeDeliveryQuote(destinationAddress) {
  const [depot, dest] = await Promise.all([
    getDepotCoords(),
    geocodeAddress(destinationAddress),
  ]);
  const { distanceKm, durationMin } = await getDrivingDistanceKm(depot, dest);
  const baseFee = parseFloat(getSetting('delivery_base_fee', '15'));
  const perKm = parseFloat(getSetting('delivery_per_km', '1.2'));
  const fee = Math.round((baseFee + perKm * distanceKm) * 100) / 100;
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin: Math.round(durationMin),
    fee,
  };
}

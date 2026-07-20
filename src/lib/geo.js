// Geocodage (Nominatim/OpenStreetMap) + distance routière (OSRM) — services publics gratuits, sans clé API.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const USER_AGENT = 'OA-Evenementiel-Website/1.0 (contact@oa-evenementiel.fr)';

let depotCoordsCache = null;

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
  if (depotCoordsCache) return depotCoordsCache;
  const address = process.env.DEPOT_ADDRESS || '72 rue Victor Basch, 92120 Montrouge, France';
  depotCoordsCache = await geocodeAddress(address);
  return depotCoordsCache;
}

export async function computeDeliveryQuote(destinationAddress) {
  const [depot, dest] = await Promise.all([
    getDepotCoords(),
    geocodeAddress(destinationAddress),
  ]);
  const { distanceKm, durationMin } = await getDrivingDistanceKm(depot, dest);
  const baseFee = parseFloat(process.env.DELIVERY_BASE_FEE || '15');
  const perKm = parseFloat(process.env.DELIVERY_PER_KM || '1.2');
  const fee = Math.round((baseFee + perKm * distanceKm) * 100) / 100;
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin: Math.round(durationMin),
    fee,
  };
}

import { suggestAddresses } from '../../src/lib/geo';
import { rateLimit } from '../../src/lib/rate-limit.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  if (!rateLimit(req, res, { key: 'geocode', limit: 60, windowMs: 60 * 1000 })) return;

  const q = (req.query.q || '').toString().trim();
  if (q.length < 3) {
    return res.status(200).json({ data: [] });
  }

  try {
    const suggestions = await suggestAddresses(q);
    return res.status(200).json({ data: suggestions });
  } catch (error) {
    // Autocomplete is a UX nicety, not a hard requirement — fail soft so a
    // flaky Nominatim call never blocks the user from typing their address.
    console.error('[Geocode Suggest API Error]', error);
    return res.status(200).json({ data: [] });
  }
}

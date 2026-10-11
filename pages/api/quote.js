import { computeDeliveryQuote } from '../../src/lib/geo';
import { rateLimit } from '../../src/lib/rate-limit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  if (!rateLimit(req, res, { key: 'quote', limit: 30, windowMs: 10 * 60 * 1000 })) return;

  const { address } = req.body || {};
  if (!address || !address.trim()) {
    return res.status(400).json({ message: 'Adresse manquante' });
  }

  try {
    const quote = await computeDeliveryQuote(address.trim());
    return res.status(200).json({ data: quote });
  } catch (error) {
    console.error('[Quote API Error]', error);
    return res.status(422).json({ message: error.message || 'Impossible de calculer les frais de livraison pour cette adresse.' });
  }
}

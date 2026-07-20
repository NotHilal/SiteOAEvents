import { computeDeliveryQuote } from '../../src/lib/geo';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

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

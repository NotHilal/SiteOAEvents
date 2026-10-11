import { checkAdminCredentials, createAdminToken, isAuthConfigured } from '../../../src/lib/auth';
import { rateLimit } from '../../../src/lib/rate-limit';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  // Brute-force damping: 8 attempts per 15 minutes per IP.
  if (!rateLimit(req, res, { key: 'login', limit: 8, windowMs: 15 * 60 * 1000 })) return;

  if (!isAuthConfigured()) {
    console.error('[API Login] JWT_SECRET / ADMIN_EMAIL / ADMIN_PASSWORD non configurés.');
    return res.status(503).json({ message: "L'accès administrateur n'est pas configuré sur ce serveur." });
  }

  try {
    const { email, password } = req.body || {};
    if (checkAdminCredentials(email, password)) {
      const cleanEmail = String(email).trim().toLowerCase();
      const token = createAdminToken(cleanEmail);
      return res.status(200).json({
        user: { email: cleanEmail, role: 'authenticated' },
        session: { access_token: token, user: { email: cleanEmail, role: 'authenticated' } },
      });
    }
    return res.status(400).json({ message: 'Identifiants incorrects.' });
  } catch (error) {
    console.error('[API Login Error]', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

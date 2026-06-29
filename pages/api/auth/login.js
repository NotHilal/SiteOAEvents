import crypto from 'crypto';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { email, password } = req.body;

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@oa-evenementiel.fr';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';

    if (email === adminEmail && password === adminPassword) {
      // Create a secure token locally using crypto (zero dependencies)
      const payload = {
        email,
        role: 'authenticated',
        exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      };
      
      const secret = process.env.JWT_SECRET || 'super_secret_local_key_for_jwt_tokens_12345';
      const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64');
      const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('base64');
      const token = `${payloadStr}.${signature}`;

      return res.status(200).json({
        user: { email, role: 'authenticated' },
        session: {
          access_token: token,
          user: { email, role: 'authenticated' }
        }
      });
    }

    return res.status(400).json({ message: 'Identifiants incorrects.' });
  } catch (error) {
    console.error('[API Login Error]', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

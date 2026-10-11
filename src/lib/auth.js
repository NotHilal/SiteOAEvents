import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Admin auth shared by every API route (was copy-pasted into db.js,
// upload.js, notify.js and login.js, each with a hardcoded fallback secret
// — anyone reading the source could forge an admin token whenever
// JWT_SECRET wasn't set).
//
// In production, JWT_SECRET / ADMIN_EMAIL / ADMIN_PASSWORD are required:
// without them admin login is simply refused. In development a throwaway
// secret is generated per server start so local work needs no setup.

const isProd = process.env.NODE_ENV === 'production';
let warned = false;

function getDevSecret() {
  try {
    const secretPath = path.join(process.cwd(), 'data', '.jwt_dev_secret');
    if (fs.existsSync(secretPath)) {
      const saved = fs.readFileSync(secretPath, 'utf8').trim();
      if (saved.length >= 32) return saved;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, generated, 'utf8');
    return generated;
  } catch {
    return globalThis.__OA_DEV_JWT_SECRET__ || (globalThis.__OA_DEV_JWT_SECRET__ = crypto.randomBytes(32).toString('hex'));
  }
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isProd) return null;
  if (!warned) {
    console.warn('[auth] JWT_SECRET absent ou trop court (< 32 caractères) — secret temporaire utilisé en développement.');
    warned = true;
  }
  return getDevSecret();
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) {
    // Still burn comparable time so length isn't leaked by timing.
    crypto.timingSafeEqual(ba, ba);
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

function sign(payloadStr, secret) {
  return crypto.createHmac('sha256', secret).update(payloadStr).digest('base64url');
}

export function createAdminToken(email) {
  const secret = getJwtSecret();
  if (!secret) throw new Error('JWT_SECRET manquant');
  const payload = { email, role: 'authenticated', exp: Date.now() + 12 * 60 * 60 * 1000 };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadStr}.${sign(payloadStr, secret)}`;
}

export function isAuthorized(req) {
  try {
    const secret = getJwtSecret();
    if (!secret) return false;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    const [payloadStr, signature] = authHeader.slice(7).split('.');
    if (!payloadStr || !signature) return false;
    if (!safeEqual(signature, sign(payloadStr, secret))) return false;
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return false;
    return payload.role === 'authenticated';
  } catch {
    return false;
  }
}

// Returns true only for the configured admin. No default credentials in
// production; in development falls back to admin@oa-evenementiel.fr /
// admin1234 so the dashboard stays usable without a .env.
export function checkAdminCredentials(email, password) {
  let adminEmail = process.env.ADMIN_EMAIL;
  let adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    if (isProd) return false;
    adminEmail = adminEmail || 'admin@oa-evenementiel.fr';
    adminPassword = adminPassword || 'admin1234';
  }
  const emailOk = safeEqual(String(email || '').trim().toLowerCase(), adminEmail.trim().toLowerCase());
  const passOk = safeEqual(String(password || ''), adminPassword);
  return emailOk && passOk;
}

export function isAuthConfigured() {
  return !!getJwtSecret() && (!isProd || (!!process.env.ADMIN_EMAIL && !!process.env.ADMIN_PASSWORD));
}

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export const CUSTOMER_COOKIE = 'oa_customer_session'
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000
const isProd = process.env.NODE_ENV === 'production'

function getDevSecret() {
  try {
    const secretPath = path.join(process.cwd(), 'data', '.customer_jwt_dev_secret')
    if (fs.existsSync(secretPath)) {
      const saved = fs.readFileSync(secretPath, 'utf8').trim()
      if (saved.length >= 32) return saved
    }
    const generated = crypto.randomBytes(32).toString('hex')
    fs.mkdirSync(path.dirname(secretPath), { recursive: true })
    fs.writeFileSync(secretPath, generated, 'utf8')
    return generated
  } catch {
    return globalThis.__OA_CUSTOMER_DEV_SECRET__ || (globalThis.__OA_CUSTOMER_DEV_SECRET__ = crypto.randomBytes(32).toString('hex'))
  }
}

function getSecret() {
  const configured = process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET
  if (configured && configured.length >= 32) return configured
  return isProd ? null : getDevSecret()
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
}

export function hashCustomerPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function customerPasswordError(password) {
  return typeof password !== 'string' || password.length < 8 || password.length > 128 || !/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)
    ? 'Le mot de passe doit contenir entre 8 et 128 caractères, dont une lettre et un chiffre.' : null
}

// Reconstruct a reset token only on the server. A database copy contains
// its random request id and hash, but cannot recreate the bearer token.
export function createPasswordResetToken(requestId) {
  const secret = getSecret()
  if (!secret) throw new Error('Customer authentication unavailable')
  return crypto.createHmac('sha256', secret).update(`password-reset:${requestId}`).digest('hex')
}

export function isCurrentCustomerSession(session, account) {
  return !!(session && account?.active && Number(session.sv || 0) === Number(account.session_version || 0))
}

export function verifyCustomerPassword(password, stored) {
  try {
    const [algorithm, salt, expected] = String(stored || '').split('$')
    if (algorithm !== 'scrypt' || !salt || !expected) return false
    const actual = crypto.scryptSync(String(password), salt, 64).toString('hex')
    return safeEqual(actual, expected)
  } catch {
    return false
  }
}

export function createCustomerToken(account) {
  const secret = getSecret()
  if (!secret) throw new Error('CUSTOMER_JWT_SECRET ou JWT_SECRET manquant')
  const payload = Buffer.from(JSON.stringify({
    sub: String(account.id),
    email: account.email,
    role: 'customer',
    sv: Number(account.session_version || 0),
    exp: Date.now() + SESSION_DURATION_MS,
  })).toString('base64url')
  return `${payload}.${sign(payload, secret)}`
}

export function readCustomerToken(token) {
  try {
    const secret = getSecret()
    if (!secret) return null
    const [payload, signature] = String(token || '').split('.')
    if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) return null
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (parsed.role !== 'customer' || !parsed.sub || !parsed.exp || Date.now() > parsed.exp) return null
    return parsed
  } catch {
    return null
  }
}

export function getCustomerSession(req) {
  return readCustomerToken(req.cookies?.[CUSTOMER_COOKIE])
}

export function setCustomerCookie(res, token) {
  const parts = [
    `${CUSTOMER_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (isProd) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearCustomerCookie(res) {
  const parts = [`${CUSTOMER_COOKIE}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax']
  if (isProd) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function publicCustomer(account) {
  return {
    id: String(account.id),
    email: account.email,
    firstName: account.first_name || '',
    lastName: account.last_name || '',
    phone: account.phone || '',
    civility: account.civility || '',
    accountType: account.account_type || 'particulier',
    companyName: account.company_name || '',
    createdAt: account.created_at,
  }
}

// Small in-memory fixed-window rate limiter for public endpoints (login,
// order tracking, form submissions). Best-effort: on serverless hosting each
// instance keeps its own counters, so treat it as abuse damping, not a hard
// guarantee — put the host's WAF / rate limiting in front for that.

const buckets = new Map();

export function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

// Returns true when the request is allowed. Responds 429 itself otherwise.
export function rateLimit(req, res, { key, limit, windowMs }) {
  const now = Date.now();
  const id = `${key}:${getClientIp(req)}`;
  let b = buckets.get(id);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(id, b);
  }
  b.count += 1;
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  }
  if (b.count > limit) {
    res.setHeader('Retry-After', String(Math.ceil((b.reset - now) / 1000)));
    res.status(429).json({ message: 'Trop de tentatives. Merci de réessayer dans quelques minutes.' });
    return false;
  }
  return true;
}

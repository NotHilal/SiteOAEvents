import db from '../../../src/lib/sqlite-db';

export const config = { api: { responseLimit: false } }

// Serves photos uploaded from Espace OA (files table, see pages/api/upload.js).
// Reached through the /uploads/:path* rewrite in next.config.js, which only
// applies when no static file exists at that path — so the catalogue photos
// committed under public/uploads/ are still served straight from disk.
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }
  const segments = [].concat(req.query.path || [])
  const filePath = segments.join('/')
  if (!filePath || segments.some(s => s === '..' || s === '.')) return res.status(404).end()

  let row
  try {
    row = await db.prepare('SELECT mime, data, size, created_at FROM files WHERE path = ?').get(filePath)
  } catch (err) {
    console.error('[files] lookup failed', err)
    return res.status(500).end()
  }
  if (!row) return res.status(404).end()

  // Keep a strict allowlist, including the native videos accepted on upload.
  const mime = String(row.mime || '')
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm'].includes(mime)) return res.status(404).end()

  const etag = `"${row.size}-${Date.parse(row.created_at) || 0}"`
  res.setHeader('Content-Type', mime)
  res.setHeader('ETag', etag)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Accept-Ranges', 'bytes')
  // New uploads always get a new name, but a re-upload to the same path is
  // possible, hence revalidation rather than "immutable".
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  if (req.headers['if-none-match'] === etag) return res.status(304).end()
  const body = Buffer.from(row.data)
  // A native video player uses byte ranges for seeking and metadata loading.
  if (req.method === 'GET' && req.headers.range && (!req.headers['if-range'] || req.headers['if-range'] === etag)) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range)
    const start = match?.[1] ? Number(match[1]) : match?.[2] ? Math.max(0, body.length - Number(match[2])) : NaN
    const end = match?.[1] && match?.[2] ? Math.min(Number(match[2]), body.length - 1) : body.length - 1
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= body.length || end < start) {
      res.setHeader('Content-Range', `bytes */${body.length}`)
      return res.status(416).end()
    }
    res.setHeader('Content-Range', `bytes ${start}-${end}/${body.length}`)
    res.setHeader('Content-Length', end - start + 1)
    return res.status(206).send(body.subarray(start, end + 1))
  }
  res.setHeader('Content-Length', body.length)
  return req.method === 'HEAD' ? res.status(200).end() : res.status(200).send(body)
}

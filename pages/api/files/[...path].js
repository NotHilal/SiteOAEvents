import db from '../../../src/lib/sqlite-db';

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

  // Only images are ever stored (checked on upload); never trust anything
  // else to be rendered from our origin.
  const mime = String(row.mime || '')
  if (!mime.startsWith('image/') || mime.includes('svg')) return res.status(404).end()

  const etag = `"${row.size}-${Date.parse(row.created_at) || 0}"`
  res.setHeader('Content-Type', mime)
  res.setHeader('ETag', etag)
  // New uploads always get a new name, but a re-upload to the same path is
  // possible, hence revalidation rather than "immutable".
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  if (req.headers['if-none-match'] === etag) return res.status(304).end()
  const body = Buffer.from(row.data)
  res.setHeader('Content-Length', body.length)
  return req.method === 'HEAD' ? res.status(200).end() : res.status(200).send(body)
}

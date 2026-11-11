// Copies the page content currently online into the LOCAL database, so the
// local site and Espace OA show the same texts and photos as production.
//   npm run db:pull-content
// Read-only on production: only public GET routes are called. Writes only to
// a database on this machine (DATABASE_URL must point to localhost).
// Copied: page texts and photos (site_content), réalisations, and the
// uploaded photos they use (/uploads/…). Catalogue, orders and customers
// are not touched.
import fs from 'node:fs'
import pg from 'pg'

const PROD = (process.env.PROD_URL || 'https://oa-evenementiel.fr').replace(/\/$/, '')

function readEnv(file) {
  if (!fs.existsSync(file)) return {}
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '')]))
}
const env = { ...readEnv('.env'), ...readEnv('.env.local'), ...process.env }
const url = env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL manquant (.env.local).')
const host = new URL(url).hostname
if (!['localhost', '127.0.0.1', '::1', 'db'].includes(host)) {
  throw new Error(`Refusé : DATABASE_URL pointe vers « ${host} ». Ce script n'écrit que dans une base locale.`)
}

async function getJson(path) {
  const res = await fetch(PROD + path)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`${path} : HTTP ${res.status}`)
  return (await res.json()).data
}

// Keys exposed by pages/api/content.js (legacy editors) and pages/api/page-content.js (new editor).
const LEGACY_KEYS = ['about_page', 'images_home', 'images_contact', 'home_categories_style', 'images_galerie']
const CMS_PAGES = ['global', 'home', 'about', 'contact', 'realisations', 'faq']

const rows = []
for (const key of LEGACY_KEYS) {
  const data = await getJson(`/api/content?key=${key}`)
  if (data?.value != null) rows.push([key, data.value])
}
// Once the new editor is deployed, its saved pages are copied too. The
// public route returns the page as displayed (defaults included), which is
// exactly what the editor saves.
let cmsDeployed = false
for (const page of CMS_PAGES) {
  const data = await getJson(`/api/page-content?page=${page}`)
  if (data) { cmsDeployed = true; rows.push([`cms_${page}`, JSON.stringify(data)]) }
}
const realisations = (await getJson('/api/realisations')) || []

const uploads = new Set()
const collect = text => { for (const m of String(text).match(/\/uploads\/[a-zA-Z0-9_./-]+/g) || []) uploads.add(m.split('?')[0]) }
rows.forEach(([, v]) => collect(v))
realisations.forEach(r => collect(JSON.stringify(r)))

const db = new pg.Client({ connectionString: url })
await db.connect()
try {
  let files = 0
  for (const path of uploads) {
    const res = await fetch(PROD + path)
    if (!res.ok) { console.warn(`  photo introuvable en prod : ${path}`); continue }
    const data = Buffer.from(await res.arrayBuffer())
    await db.query('INSERT INTO files (path, mime, data, size) VALUES ($1, $2, $3, $4) ON CONFLICT (path) DO UPDATE SET mime = excluded.mime, data = excluded.data, size = excluded.size',
      [path.slice('/uploads/'.length), res.headers.get('content-type') || 'application/octet-stream', data, data.length])
    files++
  }
  await db.query('BEGIN')
  for (const [key, value] of rows) {
    await db.query('INSERT INTO site_content (key, value, updated_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now()', [key, value])
  }
  // Without the new editor in production, local editor drafts would hide the
  // production texts: they are removed so the copied ones show.
  if (!cmsDeployed) await db.query(`DELETE FROM site_content WHERE key = ANY($1)`, [CMS_PAGES.map(p => `cms_${p}`)])
  await db.query("DELETE FROM site_content WHERE key LIKE 'realisation:%'")
  for (const { id, updatedAt, ...item } of realisations) {
    await db.query('INSERT INTO site_content (key, value, updated_at) VALUES ($1, $2, $3)', [`realisation:${id}`, JSON.stringify(item), updatedAt || new Date().toISOString()])
  }
  await db.query('COMMIT')
  console.log(`Copié depuis ${PROD} : ${rows.length} contenus (${rows.map(r => r[0]).join(', ')}), ${realisations.length} réalisation(s), ${files} photo(s).`)
} catch (error) {
  await db.query('ROLLBACK').catch(() => {})
  throw error
} finally {
  await db.end()
}

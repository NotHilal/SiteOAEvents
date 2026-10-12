// One-off: copy the local database (data/db.sqlite) — and the photos
// uploaded from Espace OA on this machine — into the hosted Turso database
// that every machine and production then share.
//
//   1. Put TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local
//   2. Stop `npm run dev`
//   3. node scripts/migrate-to-turso.mjs            (refuses a non-empty target)
//      node scripts/migrate-to-turso.mjs --force    (replaces what's there)
//
// Run it on the machine whose Espace OA data is the one to keep.

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import nextEnv from '@next/env'
import { createClient } from '@libsql/client'

const root = process.cwd()
nextEnv.loadEnvConfig(root)
const force = process.argv.includes('--force')
const targetUrl = process.env.TURSO_DATABASE_URL
const targetToken = process.env.TURSO_AUTH_TOKEN
const LOCAL_URL = 'file:./data/db.sqlite'

function fail(msg) { console.error(`\n✖ ${msg}\n`); process.exit(1) }
if (!targetUrl || targetUrl.startsWith('file:')) fail('TURSO_DATABASE_URL manquant (ou pointe vers un fichier local) dans .env.local.')
if (!targetToken) fail('TURSO_AUTH_TOKEN manquant dans .env.local.')
if (!fs.existsSync(path.join(root, 'data', 'db.sqlite'))) fail('data/db.sqlite introuvable : lancez le script depuis la racine du projet.')

// 1. Bring the local database up to the current schema by running the
//    app's own startup migrations against it (Turso variables hidden so
//    the module opens the local file).
delete process.env.TURSO_DATABASE_URL
delete process.env.TURSO_AUTH_TOKEN
const { default: localDb } = await import('../src/lib/sqlite-db.js')
await localDb.prepare('SELECT 1').get()
const source = createClient({ url: LOCAL_URL, intMode: 'number' })

// 2. Photos uploaded on this machine (public/uploads/, not committed to
//    git) go into the files table under the same path, so the /uploads/…
//    URLs already saved in the database keep working once shared.
const uploadsDir = path.join(root, 'public', 'uploads')
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif' }
let tracked = new Set()
try {
  tracked = new Set(execSync('git ls-files public/uploads', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean).map(f => f.replace(/^public\/uploads\//, '')))
} catch {}
function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])
}
let imported = 0
for (const file of walk(uploadsDir)) {
  const rel = path.relative(uploadsDir, file).split(path.sep).join('/')
  const mime = MIME[path.extname(file).toLowerCase()]
  if (!mime || tracked.has(rel)) continue
  const data = fs.readFileSync(file)
  await source.execute({ sql: 'INSERT OR IGNORE INTO files (path, mime, data, size, created_at) VALUES (?, ?, ?, ?, ?)', args: [rel, mime, data, data.length, new Date().toISOString()] })
  imported++
}
console.log(`• ${imported} photo(s) importée(s) depuis public/uploads/ dans la base locale`)

// 3. Copy schema and rows.
const target = createClient({ url: targetUrl, authToken: targetToken, intMode: 'number' })
const { rows: objects } = await source.execute("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type = 'index', name")
const tables = objects.filter(o => o.type === 'table').map(o => o.name)

const { rows: existing } = await target.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' AND name NOT LIKE 'libsql_%'")
let nonEmpty = []
for (const { name } of existing) {
  const { rows } = await target.execute(`SELECT COUNT(*) AS n FROM "${name}"`)
  if (rows[0].n > 0) nonEmpty.push(`${name} (${rows[0].n})`)
}
if (nonEmpty.length && !force) fail(`La base Turso contient déjà des données : ${nonEmpty.join(', ')}.\n  Relancez avec --force pour les remplacer par la base locale.`)
for (const { name } of existing) await target.execute(`DROP TABLE IF EXISTS "${name}"`)

for (const o of objects) await target.execute(o.sql)

for (const table of tables) {
  const { rows, columns } = await source.execute(`SELECT * FROM "${table}"`)
  const cols = columns.map(c => `"${c}"`).join(', ')
  const marks = columns.map(() => '?').join(', ')
  const batchSize = table === 'files' ? 4 : 100
  for (let i = 0; i < rows.length; i += batchSize) {
    await target.batch(rows.slice(i, i + batchSize).map(r => ({
      sql: `INSERT INTO "${table}" (${cols}) VALUES (${marks})`,
      args: columns.map(c => r[c]),
    })), 'write')
  }
}

// 4. Check.
let ok = true
for (const table of tables) {
  const a = (await source.execute(`SELECT COUNT(*) AS n FROM "${table}"`)).rows[0].n
  const b = (await target.execute(`SELECT COUNT(*) AS n FROM "${table}"`)).rows[0].n
  if (a !== b) ok = false
  console.log(`${a === b ? '✓' : '✖'} ${table.padEnd(22)} ${a} → ${b}`)
}
if (!ok) fail('Des lignes manquent dans Turso : rien n\'a été supprimé en local, relancez avec --force.')
console.log('\n✔ Base copiée dans Turso. Mettez les deux mêmes lignes TURSO_* dans le .env.local de chaque machine (et dans les variables de votre hébergeur), puis redémarrez le serveur.\n')
process.exit(0)

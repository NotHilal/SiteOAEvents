// Consistent local SQLite snapshot (including files BLOBs); no application migrations.
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createClient } from '@libsql/client'
import nextEnv from '@next/env'

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const inside = (parent, child) => { const rel = path.relative(parent, child); return !rel.startsWith('..') && !path.isAbsolute(rel) }
const quoted = value => `'${value.replaceAll("'", "''")}'`

async function walk(directory, prefix = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw Error('Les liens symboliques sont refusés dans les médias sauvegardés.')
    const relative = path.posix.join(prefix, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path.join(directory, entry.name), relative))
    else if (entry.isFile()) files.push(relative)
  }
  return files.sort()
}

async function checkDatabase(filename) {
  const db = createClient({ url: pathToFileURL(filename).href })
  try {
    const check = await db.execute('PRAGMA integrity_check')
    if (check.rows.length !== 1 || Object.values(check.rows[0])[0] !== 'ok') throw Error('Intégrité SQLite invalide.')
    const tables = (await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")).rows
    const counts = {}
    for (const { name } of tables) counts[name] = Number((await db.execute(`SELECT COUNT(*) AS n FROM "${name.replaceAll('"', '""')}"`)).rows[0].n)
    return counts
  } finally { db.close() }
}

export async function createBackup({ source, output, uploads }) {
  const sourcePath = await fs.realpath(source)
  const outputPath = path.resolve(output)
  if (inside(path.resolve('public'), outputPath) || inside(path.resolve('.next'), outputPath)) throw Error('La sauvegarde doit rester hors des dossiers servis par le site.')
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.mkdir(outputPath) // Refuse any existing destination, even empty.
  const target = path.join(outputPath, 'db.sqlite')
  const db = createClient({ url: pathToFileURL(sourcePath).href })
  try {
    await db.execute('PRAGMA busy_timeout = 10000')
    await db.execute(`VACUUM INTO ${quoted(target.replaceAll('\\', '/'))}`)
  } finally { db.close() }
  const tables = await checkDatabase(target)
  if (uploads) {
    try {
      await fs.access(uploads)
      await walk(uploads) // Reject symlinks before copying.
      await fs.cp(uploads, path.join(outputPath, 'public', 'uploads'), { recursive: true, errorOnExist: true, force: false })
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  const files = []
  for (const relative of await walk(outputPath)) {
    const bytes = await fs.readFile(path.join(outputPath, relative))
    files.push({ path: relative, size: bytes.length, sha256: hash(bytes) })
  }
  await fs.writeFile(path.join(outputPath, 'manifest.json'), JSON.stringify({ version: 1, createdAt: new Date().toISOString(), tables, files }, null, 2), { flag: 'wx' })
  await verifyBackup(outputPath)
  return outputPath
}

export async function verifyBackup(directory) {
  const root = await fs.realpath(directory)
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'))
  if (manifest.version !== 1 || !Array.isArray(manifest.files) || !manifest.files.some(f => f.path === 'db.sqlite')) throw Error('Manifeste invalide.')
  const actual = await walk(root)
  const declared = manifest.files.map(f => f.path)
  if (new Set(declared).size !== declared.length || JSON.stringify(actual.filter(p => p !== 'manifest.json').sort()) !== JSON.stringify([...declared].sort())) throw Error('Liste des fichiers incohérente.')
  for (const file of manifest.files) {
    const filename = path.resolve(root, file.path)
    if (!inside(root, filename) || path.isAbsolute(file.path)) throw Error('Chemin de sauvegarde invalide.')
    const bytes = await fs.readFile(filename)
    if (bytes.length !== file.size || hash(bytes) !== file.sha256) throw Error('Contrôle SHA-256 échoué.')
  }
  const tables = await checkDatabase(path.join(root, 'db.sqlite'))
  if (JSON.stringify(tables) !== JSON.stringify(manifest.tables)) throw Error('Comptage des tables incohérent.')
  return manifest
}

export async function restoreBackup({ backup, output }) {
  await verifyBackup(backup)
  const destination = path.resolve(output)
  if (inside(path.resolve('public'), destination) || inside(path.resolve('.next'), destination)) throw Error('La restauration doit rester hors des dossiers publics.')
  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.mkdir(destination) // Never overwrite a live database.
  for (const entry of await fs.readdir(backup)) {
    await fs.cp(path.join(backup, entry), path.join(destination, entry), { recursive: true, force: false, errorOnExist: true })
  }
  await verifyBackup(destination)
  return destination
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} })
    const [command, ...args] = process.argv.slice(2)
    const options = {}
    for (let i = 0; i < args.length; i += 2) {
      if (!['--source', '--output', '--uploads', '--backup'].includes(args[i]) || !args[i + 1]) throw Error('Arguments invalides.')
      options[args[i].slice(2)] = args[i + 1]
    }
    if (command === 'create') {
      const url = process.env.TURSO_DATABASE_URL
      if (!options.source && url && !url.startsWith('file:')) throw Error('Base distante : utiliser les sauvegardes du fournisseur. Aucune sauvegarde locale effectuée.')
      const source = options.source || (url ? fileURLToPath(new URL(url, pathToFileURL(process.cwd() + path.sep))) : 'data/db.sqlite')
      const output = options.output || path.join('backups', `oa-${new Date().toISOString().replaceAll(':', '-')}-${crypto.randomBytes(3).toString('hex')}`)
      console.log('Sauvegarde vérifiée :', await createBackup({ source, output, uploads: options.uploads || 'public/uploads' }))
    } else if (command === 'verify' && options.backup) {
      await verifyBackup(options.backup); console.log('Sauvegarde intègre : SQLite, comptages et SHA-256 vérifiés.')
    } else if (command === 'restore' && options.backup && options.output) {
      console.log('Copie restaurée et vérifiée :', await restoreBackup({ backup: options.backup, output: options.output }))
    } else throw Error('Usage : node scripts/backup-local.mjs create [--source fichier] [--output dossier] [--uploads dossier] | verify --backup dossier | restore --backup dossier --output NOUVEAU_dossier')
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}

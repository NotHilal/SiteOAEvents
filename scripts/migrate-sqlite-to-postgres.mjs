#!/usr/bin/env node
// Copies the old SQLite database (data/db.sqlite) into PostgreSQL.
//
//   DATABASE_URL=postgres://… node scripts/migrate-sqlite-to-postgres.mjs [path/to/db.sqlite] [--replace]
//
// Creates the schema if needed, then copies every table, converting types
// (0/1 → booleans, JSON text → jsonb, blobs → bytea). Rows that would break
// a constraint (price tier of a deleted item, duplicate e-mail…) are skipped
// and counted. Refuses to run on a PostgreSQL database that already holds
// data unless --replace is given (which empties it first).
import path from 'node:path'
import { createClient } from '@libsql/client'
import pg from 'pg'

const args = process.argv.slice(2)
const replace = args.includes('--replace')
const file = path.resolve(args.find(a => !a.startsWith('--')) || 'data/db.sqlite')
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL manquant.'); process.exit(1) }

process.env.OA_SKIP_CATALOG_SEED = '1'
const { ready, default: appDb } = await import('../src/lib/db/index.js')
await ready() // schema migrations

const sqlite = createClient({ url: `file:${file}`, intMode: 'number' })
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()

const TABLES = [
  'categories', 'products', 'materials', 'material_price_tiers', 'stock_movements',
  'customer_accounts', 'customer_password_resets', 'customer_welcome_emails',
  'reservations', 'payments', 'order_emails', 'blocked_dates', 'blocked_hours',
  'contacts', 'settings', 'site_content', 'files',
]
const BOOLEAN = { materials: ['available'], customer_accounts: ['active'], contacts: ['read'] }
const JSON_ARRAY = { materials: ['gallery'], reservations: ['dates', 'materials', 'rental_hours'] }
const DATE = { reservations: ['date'], blocked_dates: ['date'], blocked_hours: ['date'], payments: ['due_date'] }
// Flags of the old SQLite seeding, meaningless in PostgreSQL.
const DROP_SETTINGS = /(_seeded|^catalog_images_v1|^catalog_v3_brochure)$/

async function sqliteTables() {
  const { rows } = await sqlite.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
  return new Set(rows.map(r => r.name))
}
async function pgColumns(table) {
  const { rows } = await client.query('SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1', [table])
  return new Map(rows.map(r => [r.column_name, r]))
}

function convert(table, col, value) {
  if (value === undefined) return undefined
  if (BOOLEAN[table]?.includes(col)) return value == null ? null : value === 1 || value === true || value === '1' || value === 'true'
  if (JSON_ARRAY[table]?.includes(col)) {
    try { const v = JSON.parse(value || '[]'); return JSON.stringify(Array.isArray(v) ? v : []) } catch { return '[]' }
  }
  if (DATE[table]?.includes(col)) return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null
  if (value instanceof ArrayBuffer) return Buffer.from(value)
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  return value
}

try {
  const present = await sqliteTables()
  const { rows: [{ n }] } = await client.query('SELECT (SELECT COUNT(*) FROM materials) + (SELECT COUNT(*) FROM reservations) + (SELECT COUNT(*) FROM customer_accounts) AS n')
  if (Number(n) > 0 && !replace) {
    console.error('La base PostgreSQL contient déjà des données. Relancez avec --replace pour la vider et tout recopier.')
    process.exit(1)
  }
  await client.query('BEGIN')
  // Empty target (with --replace, or holding only the defaults added at startup).
  await client.query(`TRUNCATE ${TABLES.join(', ')} CASCADE`)

  const report = []
  for (const table of TABLES) {
    if (!present.has(table)) { report.push([table, 0, 0, 'absente']); continue }
    const columns = await pgColumns(table)
    const { rows } = await sqlite.execute(`SELECT * FROM ${table}`)
    let ok = 0
    let skipped = 0
    for (const row of rows) {
      if (table === 'settings' && DROP_SETTINGS.test(row.key)) { skipped++; continue }
      const data = {}
      for (const [col, raw] of Object.entries(row)) {
        if (!columns.has(col)) continue
        const v = convert(table, col, raw)
        if (v == null && columns.get(col).is_nullable === 'NO') continue // let the default apply
        data[col] = v
      }
      if (table === 'reservations' && !data.date) { skipped++; continue }
      const keys = Object.keys(data)
      await client.query('SAVEPOINT row')
      try {
        await client.query(`INSERT INTO ${table} (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})`, keys.map(k => data[k]))
        await client.query('RELEASE SAVEPOINT row')
        ok++
      } catch (error) {
        await client.query('ROLLBACK TO SAVEPOINT row')
        // Dangling references are cleared rather than dropping the whole row.
        if (error.code === '23503' && table === 'materials' && data.product_id) { data.product_id = null; data.variant_label = null; data.variant_order = null }
        else if (error.code === '23503' && table === 'reservations' && data.account_id) data.account_id = null
        else { skipped++; if (process.env.VERBOSE) console.warn(`  ${table} ${row.id || row.key || row.path}: ${error.message}`); continue }
        const k2 = Object.keys(data)
        try {
          await client.query(`INSERT INTO ${table} (${k2.map(k => `"${k}"`).join(', ')}) VALUES (${k2.map((_, i) => `$${i + 1}`).join(', ')})`, k2.map(k => data[k]))
          ok++
        } catch { skipped++ }
      }
    }
    report.push([table, ok, skipped, ''])
  }
  await client.query('COMMIT')
  console.log('\nMigration terminée :')
  for (const [t, ok, skipped, note] of report) console.log(`  ${t.padEnd(26)} ${String(ok).padStart(6)} copiées${skipped ? `, ${skipped} ignorées` : ''}${note ? ` (${note})` : ''}`)
  console.log('\nRelancez le site : les réglages par défaut manquants seront ajoutés au démarrage.')
} catch (error) {
  await client.query('ROLLBACK').catch(() => {})
  console.error('Migration annulée, rien n’a été modifié :', error.message)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
  await appDb.close()
  sqlite.close()
}

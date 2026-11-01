import crypto from 'node:crypto'
import pg from 'pg'
import { MIGRATIONS } from './migrations.js'
import { seedDatabase } from './seed.js'

// Server-only PostgreSQL access (DATABASE_URL).
//
//   db.prepare(sql).get(...args) / .all(...args) / .run(...args)
//   db.writeTransaction(async tx => { … tx.prepare(sql).get(…) … })
//
// SQL uses `?` placeholders (turned into $1, $2… here). Values come back as
// plain JS: dates as 'YYYY-MM-DD', timestamps as ISO strings, jsonb as its
// JSON text (callers JSON.parse it), bigint/numeric as numbers.

const { Pool, types } = pg
types.setTypeParser(20, v => Number.parseInt(v, 10))              // int8 (COUNT(*))
types.setTypeParser(1700, v => Number.parseFloat(v))              // numeric
types.setTypeParser(1082, v => v)                                 // date → 'YYYY-MM-DD'
types.setTypeParser(1114, v => new Date(`${v.replace(' ', 'T')}Z`).toISOString()) // timestamp
types.setTypeParser(1184, v => new Date(v).toISOString())         // timestamptz
types.setTypeParser(3802, v => v)                                 // jsonb → JSON text
types.setTypeParser(114, v => v)                                  // json → JSON text

function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL manquant : configurez la connexion PostgreSQL (voir .env.example).')
  const pool = new Pool({ connectionString, max: Number(process.env.DATABASE_POOL_MAX) || 10, idleTimeoutMillis: 30000 })
  pool.on('error', error => console.error('[db] idle client error', error.message))
  return pool
}

// One pool per process, kept across dev hot reloads.
const pool = () => (globalThis.__oaPgPool ||= createPool())

// `?` → `$n`, skipping quoted strings and identifiers.
const compiled = new Map()
export function toPg(sql) {
  let out = compiled.get(sql)
  if (out) return out
  out = ''
  let n = 0
  let quote = null
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]
    if (quote) {
      out += c
      if (c === quote) quote = null
    } else if (c === "'" || c === '"') {
      quote = c
      out += c
    } else if (c === '?') out += `$${++n}`
    else out += c
  }
  compiled.set(sql, out)
  return out
}

const normalizeArgs = args => (args.length === 1 && Array.isArray(args[0]) ? args[0] : args).map(v => (v === undefined ? null : v))

function statements(query) {
  return sql => {
    const text = toPg(sql)
    return {
      async get(...args) { return (await query(text, normalizeArgs(args))).rows[0] },
      async all(...args) { return (await query(text, normalizeArgs(args))).rows },
      async run(...args) { const r = await query(text, normalizeArgs(args)); return { changes: r.rowCount ?? 0 } },
    }
  }
}

// Schema migrations + default data, once per process.
async function init() {
  const client = await pool().connect()
  try {
    await client.query('SELECT pg_advisory_lock(727001)')
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
    const { rows } = await client.query('SELECT id FROM schema_migrations')
    const done = new Set(rows.map(r => r.id))
    for (const m of MIGRATIONS) {
      if (done.has(m.id)) continue
      await client.query('BEGIN')
      try {
        await client.query(m.sql)
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [m.id])
        await client.query('COMMIT')
        console.log(`[db] migration ${m.id} appliquée`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }
    await seedDatabase(statements((text, args) => client.query(text, args)))
  } finally {
    await client.query('SELECT pg_advisory_unlock(727001)').catch(() => {})
    client.release()
  }
}

let readyPromise = null
export function ready() {
  if (!readyPromise) readyPromise = init().catch(error => { readyPromise = null; throw error })
  return readyPromise
}

async function query(text, args) {
  await ready()
  return pool().query(text, args)
}

const RETRYABLE = new Set(['40001', '40P01']) // serialization failure, deadlock

const db = {
  prepare: statements(query),

  // Write transactions run one at a time (advisory lock), like the SQLite
  // database used before: stock checks and the booking they guard can never
  // interleave with another order. `fn` must only use `tx`.
  async writeTransaction(fn) {
    await ready()
    for (let attempt = 1; ; attempt++) {
      const client = await pool().connect()
      try {
        await client.query('BEGIN')
        await client.query('SELECT pg_advisory_xact_lock(727002)')
        const result = await fn({ prepare: statements((text, args) => client.query(text, args)) })
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        if (!RETRYABLE.has(error?.code) || attempt >= 3) throw error
      } finally {
        client.release()
      }
    }
  },

  async close() {
    if (globalThis.__oaPgPool) await globalThis.__oaPgPool.end()
    globalThis.__oaPgPool = null
    readyPromise = null
  },
}

// Alphabet avoids visually ambiguous characters (0/O, 1/I/L): the reference
// is read off an e-mail and typed back on /suivi.
const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export async function generateReservationReference(q = db) {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = 'OA-'
    for (let i = 0; i < 6; i++) code += REFERENCE_ALPHABET[crypto.randomInt(REFERENCE_ALPHABET.length)]
    if (!(await q.prepare('SELECT 1 FROM reservations WHERE reference = ?').get(code))) return code
  }
  throw new Error('Impossible de générer une référence unique')
}

export default db

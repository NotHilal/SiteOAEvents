// Temporary PostgreSQL databases for the test scripts. Needs a server the
// tests may create databases on: TEST_DATABASE_URL (default: the local
// docker-compose.dev.yml one, see README.md).
//   const t = await createTestDatabase(); … t.url … await t.drop()
import crypto from 'node:crypto'
import pg from 'pg'
import { toPg } from '../../src/lib/db/index.js'

const ADMIN_URL = process.env.TEST_DATABASE_URL || 'postgres://oa:oa_dev_pw@localhost:5432/oa'

export async function createTestDatabase() {
  const name = `oa_test_${crypto.randomBytes(5).toString('hex')}`
  const admin = new pg.Client({ connectionString: ADMIN_URL })
  await admin.connect()
  await admin.query(`CREATE DATABASE ${name}`)
  await admin.end()
  const url = new URL(ADMIN_URL)
  url.pathname = `/${name}`
  return {
    url: url.toString(),
    async drop() {
      const c = new pg.Client({ connectionString: ADMIN_URL })
      await c.connect()
      await c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
      await c.end()
    },
  }
}

// Minimal client with the libSQL-like shape the tests use:
// execute('SQL') / execute({ sql, args }) → { rows }.
export function sqlClient(url) {
  const pool = new pg.Pool({ connectionString: url, max: 2 })
  return {
    async execute(q) {
      const { sql, args = [] } = typeof q === 'string' ? { sql: q } : q
      return { rows: (await pool.query(toPg(sql), args)).rows }
    },
    close: () => pool.end(),
  }
}

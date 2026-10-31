import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@libsql/client'
import { createBackup, verifyBackup, restoreBackup } from './backup-local.mjs'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'oa-backup-test-'))
const source = path.join(root, 'source.sqlite')
const backup = path.join(root, 'backup')
const restored = path.join(root, 'restore')
const uploads = path.join(root, 'uploads')
const client = createClient({ url: pathToFileURL(source).href })
let restoredDb
try {
  await client.execute('PRAGMA journal_mode=WAL')
  await client.execute('PRAGMA wal_autocheckpoint=0')
  await client.executeMultiple('CREATE TABLE files(path TEXT PRIMARY KEY, data BLOB); CREATE TABLE orders(id TEXT PRIMARY KEY, status TEXT);')
  const media = Buffer.from([0, 1, 255, 0, 128, 32])
  await client.execute({ sql: 'INSERT INTO files VALUES (?,?)', args: ['video.mp4', media] })
  await client.execute("INSERT INTO orders VALUES ('test','confirmed')")
  await fs.mkdir(uploads)
  await fs.writeFile(path.join(uploads, 'legacy.png'), media)
  await createBackup({ source, output: backup, uploads })
  await client.execute("UPDATE orders SET status='changed-after-snapshot'")
  assert.equal((await verifyBackup(backup)).tables.files, 1)
  await assert.rejects(createBackup({ source, output: backup, uploads }), /EEXIST/)
  await restoreBackup({ backup, output: restored })
  await assert.rejects(restoreBackup({ backup, output: restored }), /EEXIST/)
  restoredDb = createClient({ url: pathToFileURL(path.join(restored, 'db.sqlite')).href })
  assert.equal((await restoredDb.execute('SELECT status FROM orders')).rows[0].status, 'confirmed', 'restore exact snapshot, including committed WAL data')
  assert.deepEqual(Buffer.from((await restoredDb.execute('SELECT data FROM files')).rows[0].data), media)
  assert.deepEqual(await fs.readFile(path.join(restored, 'public/uploads/legacy.png')), media)
  restoredDb.close(); restoredDb = null
  await fs.writeFile(path.join(backup, 'public/uploads/legacy.png'), 'corrupted')
  await assert.rejects(verifyBackup(backup), /SHA-256/)
  await assert.rejects(restoreBackup({ backup, output: path.join(root, 'bad-restore') }), /SHA-256/)
  await assert.rejects(fs.access(path.join(root, 'bad-restore')))
  console.log('PASS: consistent WAL snapshot, database integrity, media BLOBs and legacy files, SHA-256, isolated restore, no overwrite, corrupt backup rejected. Temporary data only.')
} finally {
  restoredDb?.close(); client.close()
  if (!path.resolve(root).startsWith(path.join(os.tmpdir(), 'oa-backup-test-'))) throw Error('Unsafe fixture directory')
  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
}

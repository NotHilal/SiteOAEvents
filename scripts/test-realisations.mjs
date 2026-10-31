// Run after npm run build. Uses a disposable SQLite DB and never the site DB.
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'oa-realisations-'))
const socket = net.createServer()
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve))
const port = socket.address().port
await new Promise(resolve => socket.close(resolve))
const base = `http://localhost:${port}`
const secret = crypto.randomBytes(32).toString('hex')
const payload = Buffer.from(JSON.stringify({ role: 'authenticated', exp: Date.now() + 3600000 })).toString('base64url')
const token = `${payload}.${crypto.createHmac('sha256', secret).update(payload).digest('base64url')}`
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
  env: { ...process.env, TURSO_DATABASE_URL: `file:${path.join(directory, 'qa.sqlite').replaceAll('\\', '/')}`, TURSO_AUTH_TOKEN: '', JWT_SECRET: secret },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
server.stdout.on('data', data => { logs += data })
server.stderr.on('data', data => { logs += data })

async function api(method, body, expected, auth = true) {
  const response = await fetch(`${base}/api/realisations`, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const json = await response.json()
  assert.equal(response.status, expected, JSON.stringify(json))
  return json.data
}
async function upload(name, type, bytes, expected = 200, auth = true) {
  const form = new FormData()
  form.set('file', new Blob([bytes], { type }), name)
  const response = await fetch(`${base}/api/upload`, { method: 'POST', headers: auth ? { Authorization: `Bearer ${token}` } : {}, body: form })
  const json = await response.json()
  assert.equal(response.status, expected, JSON.stringify(json))
  return json.data ? `/uploads/${json.data.path}` : null
}

try {
  let ready = false
  for (let n = 0; n < 100; n++) {
    try { if ((await fetch(`${base}/api/realisations`)).ok) { ready = true; break } } catch {}
    if (server.exitCode !== null) throw new Error(logs)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  assert.ok(ready, logs)
  assert.deepEqual(await api('GET', null, 200, false), [])
  const legacyURL = `${base}/api/db?table=site_content&filters=${encodeURIComponent(JSON.stringify([{ type: 'eq', field: 'key', value: 'images_galerie' }]))}`
  const legacy = await (await fetch(legacyURL)).text()
  assert.match(await (await fetch(`${base}/nos-realisations`)).text(), /Nos réalisations arrivent bientôt/)
  for (const route of ['/galerie', '/nos-experiences']) {
    const response = await fetch(base + route, { redirect: 'manual' })
    assert.equal(response.status, 308)
    assert.equal(response.headers.get('location'), '/nos-realisations')
  }
  await api('POST', {}, 401, false)
  await api('PUT', { id: 'test' }, 401, false)
  await api('DELETE', { id: 'test' }, 401, false)
  await api('POST', {}, 400)
  await upload('bad.svg', 'image/svg+xml', '<svg/>', 400)
  await upload('bad.mp4', 'video/mp4', 'invalid video', 400)
  await upload('big.mp4', 'video/mp4', Buffer.alloc(10 * 1024 * 1024 + 1), 413)
  await upload('test.png', 'image/png', 'test', 401, false)
  const cover = await upload('cover.png', 'image/png', await fs.readFile('public/icon-192.png'))
  const videoBytes = await fs.readFile('public/videos/oa-hero-540.mp4')
  const video = await upload('video.mp4', 'video/mp4', videoBytes)
  const item = await api('POST', { title: 'Événement de vérification', slug: 'evenement-verification', summary: 'Contenu temporaire de test.', body: 'Premier paragraphe.\n\nSecond paragraphe <script>alert(1)</script>.', cover, media: [{ type: 'image', src: cover, caption: 'Photo de test' }, { type: 'video', src: video, caption: 'Vidéo de test' }] }, 201)
  await api('POST', item, 409)
  const parallel = await Promise.all([0, 1].map(() => fetch(`${base}/api/realisations`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...item, slug: 'creation-simultanee' }) })))
  assert.deepEqual(parallel.map(r => r.status).sort(), [201, 409])
  const simultaneousItem = await parallel.find(r => r.status === 201).json()
  await api('DELETE', { id: simultaneousItem.data.id }, 200)
  const detail = await (await fetch(`${base}/nos-realisations/${item.slug}`)).text()
  assert.match(detail, /Événement de vérification/)
  assert.match(detail, /<video/)
  assert.ok(!detail.includes('<script>alert(1)</script>'))
  assert.match(await (await fetch(base)).text(), /evenement-verification/)
  assert.match(await (await fetch(`${base}/sitemap.xml`)).text(), /nos-realisations\/evenement-verification/)
  let response = await fetch(base + video, { headers: { Range: 'bytes=0-31' } })
  assert.equal(response.status, 206)
  assert.equal(response.headers.get('content-type'), 'video/mp4')
  assert.equal(response.headers.get('content-range'), `bytes 0-31/${videoBytes.length}`)
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), videoBytes.subarray(0, 32))
  response = await fetch(base + video, { headers: { Range: 'bytes=-16' } })
  assert.equal(response.status, 206)
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), videoBytes.subarray(-16))
  assert.equal((await fetch(base + video, { headers: { Range: `bytes=${videoBytes.length}-` } })).status, 416)
  response = await fetch(base + video, { method: 'HEAD' })
  assert.equal(Number(response.headers.get('content-length')), videoBytes.length)
  assert.equal((await fetch(base + video, { headers: { 'If-None-Match': response.headers.get('etag') } })).status, 304)
  const edited = await api('PUT', { ...item, title: 'Réalisation modifiée', summary: 'Description modifiée.' }, 200)
  assert.equal(edited.title, 'Réalisation modifiée')
  assert.match(await (await fetch(`${base}/nos-realisations/${item.slug}`)).text(), /Description modifiée/)
  await api('DELETE', { id: item.id }, 200)
  assert.equal((await fetch(`${base}/nos-realisations/${item.slug}`)).status, 404)
  assert.deepEqual(await api('GET', null, 200, false), [])
  assert.ok(!(await (await fetch(`${base}/sitemap.xml`)).text()).includes('evenement-verification'))
  assert.equal(await (await fetch(legacyURL)).text(), legacy)
  console.log('PASS: empty state, redirects, authentication, validation, uploads, CRUD, SSR, homepage, sitemap, video ranges/HEAD/ETag, legacy data preservation.')
} catch (error) {
  console.error(logs)
  throw error
} finally {
  const exited = once(server, 'exit')
  server.kill()
  await exited
  await fs.rm(directory, { recursive: true, force: true })
}

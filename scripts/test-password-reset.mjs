// Build first. Disposable DB + captured fake emails: never uses real credentials.
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createClient } from '@libsql/client'

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'oa-reset-http-'))
const databaseURL = `file:${path.join(directory, 'qa.sqlite').replaceAll('\\', '/')}`
const emailsPath = path.join(directory, 'emails.json')
const failurePath = path.join(directory, 'email-failure')
const preloader = path.join(directory, 'providers.mjs')
await fs.writeFile(preloader, `import fs from 'node:fs/promises';
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (String(url) === 'https://api.resend.com/emails') {
    try { await fs.access(process.env.QA_EMAIL_FAILURE_FILE); return Response.json({message:'Simulated delivery failure'}, {status:503}); } catch {}
    const filename = process.env.QA_EMAIL_FILE;
    let emails = []; try { emails = JSON.parse(await fs.readFile(filename, 'utf8')); } catch {}
    const key = options.headers['Idempotency-Key'];
    if (!emails.some(email => email.key === key)) emails.push({key,...JSON.parse(options.body)});
    await fs.writeFile(filename, JSON.stringify(emails));
    return Response.json({id:'mail_test'});
  }
  if (String(url).startsWith('https://')) throw new Error('External network forbidden in reset QA');
  return nativeFetch(url, options);
};`)
const preview = process.argv.includes('--preview')
const socket = net.createServer()
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve))
const port = preview ? 3100 : socket.address().port
await new Promise(resolve => socket.close(resolve))
const base = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['--import', pathToFileURL(preloader).href, 'node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
  env: { ...process.env, TURSO_DATABASE_URL: databaseURL, TURSO_AUTH_TOKEN: '', JWT_SECRET: crypto.randomBytes(32).toString('hex'), CUSTOMER_JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    NEXT_PUBLIC_SITE_URL: base, PASSWORD_RESET_ORIGIN: base, RESEND_API_KEY: 'qa_fake_key_no_external_calls', EMAIL_FROM: 'OA Événementiel <contact@oa-evenementiel.fr>', NOTIFICATION_EMAIL: 'qa-notifications@example.test', STRIPE_SECRET_KEY: '', QA_EMAIL_FILE: emailsPath, QA_EMAIL_FAILURE_FILE: failurePath },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
server.stdout.on('data', data => { logs += data })
server.stderr.on('data', data => { logs += data })
const client = createClient({ url: databaseURL })
const emails = async () => JSON.parse(await fs.readFile(emailsPath, 'utf8').catch(() => '[]')).filter(mail => !mail.key?.startsWith('customer-welcome:'))
async function request(route, body, expected, cookie, method = 'POST') {
  const start = Date.now()
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.20', ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const data = await response.json().catch(() => ({}))
  assert.equal(response.status, expected, data.message || `${route}: unexpected status`)
  return { data, response, duration: Date.now() - start }
}
const forgot = email => request('/api/account/forgot-password', { email }, 200)
const reset = (token, password = 'NewPassword123', confirmation = password, expected = 200) => request('/api/account/reset-password', { token, password, confirmation }, expected)
const extractToken = mail => new URLSearchParams(new URL(mail.html.match(/href="([^"]*reinitialiser-mot-de-passe[^"]*)"/)[1]).hash.slice(1)).get('token')

try {
  let ready = false
  for (let n = 0; n < 100; n++) {
    try { if ((await fetch(base + '/api/realisations')).ok) { ready = true; break } } catch {}
    if (server.exitCode !== null) throw new Error(logs)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  assert.ok(ready, logs)
  const first = await request('/api/account/register', { firstName: 'Client', lastName: 'Test', phone: '+33612345678', email: 'client@example.test', password: 'OldPassword123' }, 201)
  const oldCookie = first.response.headers.get('set-cookie').split(';')[0]
  await request('/api/account/session', null, 200, oldCookie, 'GET')
  const known = await forgot('client@example.test')
  const unknown = await forgot('unknown@example.test')
  assert.deepEqual(known.data, unknown.data, 'do not reveal account existence')
  assert.ok(known.duration >= 2400 && unknown.duration >= 2400, 'known/unknown response timing floor')
  assert.equal((await emails()).length, 1)
  const token = extractToken((await emails())[0])
  assert.match(token, /^[a-f0-9]{64}$/)
  assert.ok(!JSON.stringify(known.data).includes(token))
  const record = (await client.execute('SELECT * FROM customer_password_resets')).rows[0]
  assert.equal(record.token_hash, crypto.createHash('sha256').update(token).digest('hex'))
  assert.ok(!JSON.stringify(record).includes(token), 'no plaintext token stored')
  await reset(token, 'short', 'short', 400)
  await reset(token, 'NewPassword123', 'Different123', 400)
  await request('/api/account/login', { email: 'client@example.test', password: 'OldPassword123' }, 200)
  const changed = await reset(token)
  assert.match(changed.response.headers.get('set-cookie'), /Max-Age=0/)
  await request('/api/account/session', null, 401, oldCookie, 'GET')
  await request('/api/account/profile', null, 401, oldCookie, 'GET')
  await request('/api/account/login', { email: 'client@example.test', password: 'OldPassword123' }, 400)
  await request('/api/account/login', { email: 'client@example.test', password: 'NewPassword123' }, 200)
  await reset(token, 'AnotherPassword123', 'AnotherPassword123', 400)
  const notices = await emails()
  assert.equal(notices.length, 2)
  assert.ok(notices.every(mail => !mail.html.includes('NewPassword123') && !mail.html.includes('OldPassword123')))
  const resetHtml = await (await fetch(base + '/mon-compte/reinitialiser-mot-de-passe')).text()
  assert.ok(!resetHtml.includes(token))
  const resetPage = await fetch(base + '/mon-compte/reinitialiser-mot-de-passe')
  assert.match(resetPage.headers.get('cache-control'), /no-store/)
  assert.equal(resetPage.headers.get('referrer-policy'), 'no-referrer')
  assert.match(resetPage.headers.get('x-robots-tag'), /noindex/)
  assert.ok((await (await fetch(base + '/mon-compte/connexion')).text()).includes('/mon-compte/mot-de-passe-oublie'))
  await client.execute("UPDATE customer_password_resets SET created_at = '2000-01-01T00:00:00.000Z'")
  await forgot('client@example.test')
  const expiredToken = extractToken((await emails()).at(-1))
  await client.execute("UPDATE customer_password_resets SET expires_at = '2000-01-01T00:00:00.000Z' WHERE used_at IS NULL")
  await reset(expiredToken, 'NextPassword123', 'NextPassword123', 400)
  await client.execute("UPDATE customer_password_resets SET created_at = '2000-01-01T00:00:00.000Z'")
  await forgot('client@example.test')
  const onceOnly = extractToken((await emails()).at(-1))
  const concurrent = await Promise.all([0, 1].map(() => fetch(base + '/api/account/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: onceOnly, password: 'Concurrent123', confirmation: 'Concurrent123' }) })))
  assert.equal(concurrent.filter(r => r.status === 200).length, 1, 'only one concurrent reset can succeed')
  assert.ok(concurrent.filter(r => r.status !== 200).every(r => [400, 503].includes(r.status)))
  await client.execute('UPDATE customer_accounts SET active = 0')
  const beforeDisabled = (await emails()).length
  const disabled = await forgot('client@example.test')
  assert.deepEqual(disabled.data, unknown.data)
  assert.equal((await emails()).length, beforeDisabled)
  await request('/api/account/forgot-password', { email: 'unknown@example.test' }, 429)
  await request('/api/account/forgot-password', null, 405, null, 'GET')
  await request('/api/account/register', { firstName: 'Autre', lastName: 'Test', phone: '+33612345678', email: 'delivery@example.test', password: 'Original123' }, 201)
  const anotherForgot = async () => {
    const response = await fetch(base + '/api/account/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.21', 'x-forwarded-host': 'attacker.example' }, body: JSON.stringify({email:'delivery@example.test'}) })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), unknown.data)
  }
  await fs.writeFile(failurePath, 'fail')
  await anotherForgot()
  const failed = (await client.execute("SELECT r.* FROM customer_password_resets r JOIN customer_accounts a ON a.id=r.account_id WHERE a.email='delivery@example.test'")).rows[0]
  assert.equal(failed.sent_at, null)
  assert.equal(failed.last_error, 'email_delivery_failed')
  await fs.unlink(failurePath)
  await client.execute({sql:"UPDATE customer_password_resets SET created_at='2000-01-01T00:00:00.000Z' WHERE id=?",args:[failed.id]})
  await anotherForgot()
  const deliverable = (await emails()).at(-1)
  assert.ok(deliverable.html.includes(base + '/mon-compte/reinitialiser-mot-de-passe'))
  assert.ok(!deliverable.html.includes('attacker.example'))
  await fs.writeFile(failurePath, 'fail')
  await reset(extractToken(deliverable), 'Replacement123')
  await request('/api/account/login', {email:'delivery@example.test',password:'Replacement123'},200)
  await fs.unlink(failurePath)
  process.env.TURSO_DATABASE_URL=databaseURL
  const {passwordResetOrigin}=await import('../src/lib/password-reset.js')
  for(const origin of ['https://www.exemple.fr','http://oa-evenementiel.fr','https://user:secret@oa-evenementiel.fr','not-a-url']) {
    process.env.PASSWORD_RESET_ORIGIN=origin
    assert.throws(()=>passwordResetOrigin())
  }
  process.env.PASSWORD_RESET_ORIGIN=base
  assert.equal(passwordResetOrigin(),base)
  const {default: importedDb}=await import('../src/lib/sqlite-db.js'); importedDb.close()
  assert.ok(!logs.includes(token) && !logs.includes('Concurrent123'), 'tokens and passwords must not be logged')
  console.log('PASS: reset email, generic responses/timing, password validation, hashed token storage, single use/expiry/concurrency, revoked sessions, new login, disabled account, rate limits, no-store/no-referrer, no secrets in responses/logs. Simulated email only.')
  if (preview) {
    await client.execute('UPDATE customer_accounts SET active = 1')
    console.log(`QA preview: ${base}/mon-compte/mot-de-passe-oublie — test database and fake email only.`)
    await new Promise(resolve => process.once('SIGINT', resolve))
  }
} catch (error) { console.error(logs); throw error }
finally {
  client.close()
  if (server.exitCode === null) { const exited = once(server, 'exit'); server.kill(); await exited }
  if (!path.resolve(directory).startsWith(path.join(os.tmpdir(), 'oa-reset-http-'))) throw new Error('Unsafe QA directory')
  await fs.rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
}

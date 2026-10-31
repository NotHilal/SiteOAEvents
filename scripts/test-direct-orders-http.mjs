// Build first. --preview keeps this isolated fixture site open for browser QA.
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

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'oa-order-http-'))
const databaseURL = `file:${path.join(directory, 'qa.sqlite').replaceAll('\\', '/')}`
const preloader = path.join(directory, 'providers.mjs')
await fs.writeFile(preloader, `const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (String(url).startsWith('https://nominatim.openstreetmap.org/')) return Response.json([{lat:'48.8',lon:'2.3'}]);
  if (String(url).startsWith('https://router.project-osrm.org/')) return Response.json({code:'Ok',routes:[{distance:10000,duration:900}]});
  if (String(url).startsWith('https://api.resend.com/')) throw new Error('Real email forbidden in QA');
  return nativeFetch(url, options);
};`)
const preview = process.argv.includes('--preview')
const socket = net.createServer()
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve))
const port = preview ? 3100 : socket.address().port
await new Promise(resolve => socket.close(resolve))
const base = `http://127.0.0.1:${port}`
const secret = crypto.randomBytes(32).toString('hex')
const payload = Buffer.from(JSON.stringify({ role: 'authenticated', exp: Date.now() + 3600000 })).toString('base64url')
const token = `${payload}.${crypto.createHmac('sha256', secret).update(payload).digest('base64url')}`
const server = spawn(process.execPath, ['--import', pathToFileURL(preloader).href, 'node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
  env: { ...process.env, TURSO_DATABASE_URL: databaseURL, TURSO_AUTH_TOKEN: '', STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '', RESEND_API_KEY: '', NOTIFICATION_EMAIL: 'notifications@example.test', JWT_SECRET: secret, ADMIN_EMAIL: 'preview@oa.test', ADMIN_PASSWORD: 'oa-preview-local' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
server.stdout.on('data', d => { logs += d })
server.stderr.on('data', d => { logs += d })
const client = createClient({ url: databaseURL })
async function request(url, method, body, expected, admin = false) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(admin ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const json = await response.json()
  assert.equal(response.status, expected, JSON.stringify(json))
  return json.data
}
try {
  let ready = false
  for (let n = 0; n < 100; n++) {
    try { if ((await fetch(base + '/api/realisations')).ok) { ready = true; break } } catch {}
    if (server.exitCode !== null) throw new Error(logs)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  assert.ok(ready, logs)
  await client.execute({ sql: "INSERT INTO materials (id,name,max_quantity,available,image_url,category) VALUES ('qa-rental','Article de vérification',1,1,'/icon-192.png','Test local')", args: [] })
  await client.execute("INSERT INTO material_price_tiers (id,material_id,min_qty,price_weekday_ht,price_weekend_ht) VALUES ('qa-rental-tier','qa-rental',1,10,10)")
  await client.execute("INSERT OR REPLACE INTO settings (key,value) VALUES ('bank_iban','QA-NOT-A-REAL-IBAN'),('bank_holder','Vérification locale'),('delivery_base_fee','15'),('delivery_per_km','1.2')")
  const date = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)
  const body = { checkout_key: crypto.randomUUID(), prenom: 'Test', nom: 'Local', phone: '0600000000', email: 'client@example.test', dates: [date], materials: [{ id: 'qa-rental', quantity: 1 }], delivery_address: 'Adresse de test', grand_total: 39 }
  const order = await request('/api/db?table=reservations', 'POST', body, 201)
  assert.equal(order.status, 'awaiting_payment')
  assert.equal((await request('/api/db?table=reservations', 'POST', body, 201)).id, order.id)
  await request('/api/db?table=reservations', 'POST', { ...body, checkout_key: crypto.randomUUID() }, 409)
  const bank = await request('/api/payments/init-virement', 'POST', { reservationId: order.id, plan: 1 }, 200)
  assert.equal(bank.bank.iban, 'QA-NOT-A-REAL-IBAN')
  const payment = (await client.execute({ sql: 'SELECT id FROM payments WHERE reservation_id = ?', args: [order.id] })).rows[0]
  const paymentBody = { payload: { status: 'paid' }, filters: [{ type: 'eq', field: 'id', value: payment.id }] }
  await request('/api/db?table=payments', 'PUT', paymentBody, 401)
  await request('/api/db?table=payments', 'PUT', paymentBody, 200, true)
  const tracked = await request('/api/track', 'POST', { reference: order.reference, email: body.email }, 200)
  assert.equal(tracked.status, 'confirmed')
  assert.equal(tracked.fullyPaid, true)
  await request('/api/db?table=reservations', 'PUT', { payload: { status: 'pending' }, filters: [{ type: 'eq', field: 'id', value: order.id }] }, 409, true)
  await request('/api/db?table=reservations', 'DELETE', { filters: [{ type: 'eq', field: 'id', value: order.id }] }, 409, true)
  const otherDate = new Date(Date.now() + 61 * 86400000).toISOString().slice(0, 10)
  const abandoned = await request('/api/db?table=reservations', 'POST', { ...body, checkout_key: crypto.randomUUID(), dates: [otherDate] }, 201)
  await request('/api/payments/init-virement', 'POST', { reservationId: abandoned.id, plan: 1 }, 200)
  const late = (await client.execute({ sql: 'SELECT id FROM payments WHERE reservation_id = ?', args: [abandoned.id] })).rows[0]
  await client.execute({ sql: 'UPDATE reservations SET expires_at = ? WHERE id = ?', args: ['2000-01-01T00:00:00.000Z', abandoned.id] })
  await request('/api/reservations/public', 'GET', null, 200)
  const expired = await request('/api/track', 'POST', { reference: abandoned.reference, email: body.email }, 200)
  assert.equal(expired.status, 'expired')
  await request('/api/db?table=payments', 'PUT', { ...paymentBody, filters: [{ type: 'eq', field: 'id', value: late.id }] }, 409, true)
  assert.ok((await (await fetch(base + '/services')).text()).includes('Demander un devis sur mesure'))
  console.log('PASS HTTP: public ordering/retry, stock conflict, bank payment, admin auth, automatic confirmation, immutable orders, expiry, late-transfer rejection, services on quote.')
  if (preview) {
    await client.execute("UPDATE materials SET max_quantity = 10 WHERE id = 'qa-rental'")
    console.log(`QA preview: ${base}/reservation — isolated database, fake geocoding, no real payments or email.`)
    await new Promise(resolve => process.once('SIGINT', resolve))
  }
} catch (error) { console.error(logs); throw error }
finally {
  client.close()
  if (server.exitCode === null) { const exited = once(server, 'exit'); server.kill(); await exited }
  if (!path.resolve(directory).startsWith(path.join(os.tmpdir(), 'oa-order-http-'))) throw new Error('Unsafe QA directory')
  await fs.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}

// Build first. Real API routes, disposable DB, simulated email provider only.
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

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'oa-welcome-http-'))
const databaseURL = `file:${path.join(directory, 'qa.sqlite').replaceAll('\\', '/')}`
const emailsPath = path.join(directory, 'emails.json')
const failurePath = path.join(directory, 'email-failure')
const preloader = path.join(directory, 'providers.mjs')
await fs.writeFile(preloader, `import fs from 'node:fs/promises';
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
  if(String(url)==='https://api.resend.com/emails'){
    try{await fs.access(process.env.QA_EMAIL_FAILURE_FILE);return Response.json({message:'Simulated failure'},{status:503});}catch{}
    const file=process.env.QA_EMAIL_FILE;let emails=[];try{emails=JSON.parse(await fs.readFile(file,'utf8'));}catch{}
    const key=options.headers['Idempotency-Key'];
    if(!emails.some(m=>m.key===key))emails.push({key,...JSON.parse(options.body)});
    await fs.writeFile(file,JSON.stringify(emails));return Response.json({id:'qa_email'});
  }
  if(String(url).startsWith('https://'))throw Error('External network forbidden in welcome QA');
  return nativeFetch(url,options);
};`)
const socket = net.createServer()
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve))
const port = socket.address().port
await new Promise(resolve => socket.close(resolve))
const base = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['--import', pathToFileURL(preloader).href, 'node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
  env: { ...process.env, TURSO_DATABASE_URL: databaseURL, TURSO_AUTH_TOKEN: '', JWT_SECRET: crypto.randomBytes(32).toString('hex'), CUSTOMER_JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    PASSWORD_RESET_ORIGIN: base, RESEND_API_KEY: 'qa_fake_key_no_real_email', EMAIL_FROM: 'OA Événementiel <contact@oa-evenementiel.fr>', NOTIFICATION_EMAIL: 'qa-notifications@example.test', STRIPE_SECRET_KEY: '', QA_EMAIL_FILE: emailsPath, QA_EMAIL_FAILURE_FILE: failurePath },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
server.stdout.on('data', data => { logs += data })
server.stderr.on('data', data => { logs += data })
const client = createClient({ url: databaseURL })
const emails = async () => JSON.parse(await fs.readFile(emailsPath, 'utf8').catch(() => '[]'))
const registration = (email, firstName = 'Client') => ({ firstName, lastName: 'Test', phone: '+33612345678', email, password: 'WelcomeTest123' })
async function request(route, body, expected, cookie, method = 'POST') {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.40', 'x-forwarded-host': 'attacker.example', ...(cookie ? {Cookie:cookie} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}) })
  const data = await response.json().catch(() => ({}))
  assert.equal(response.status, expected, data.message || route)
  return { data, response }
}
try {
  let ready = false
  for (let n = 0; n < 100; n++) {
    try { if ((await fetch(base + '/api/realisations')).ok) { ready = true; break } } catch {}
    if (server.exitCode !== null) throw Error(logs)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  assert.ok(ready, logs)
  const created = await request('/api/account/register', registration('welcome@example.test','<script>Client</script>'),201)
  const cookie = created.response.headers.get('set-cookie').split(';')[0]
  await request('/api/account/session',null,200,cookie,'GET')
  let messages = await emails()
  assert.equal(messages.length,1)
  assert.equal(messages[0].to,'welcome@example.test')
  assert.equal(messages[0].from,'OA Événementiel <contact@oa-evenementiel.fr>')
  assert.equal(messages[0].subject,'Bienvenue chez OA Événementiel')
  assert.match(messages[0].html,/&lt;script&gt;Client&lt;\/script&gt;/)
  assert.ok(!messages[0].html.includes('<script>'))
  assert.ok(messages[0].html.includes(base+'/mon-compte') && messages[0].html.includes(base+'/suivi'))
  assert.ok(!messages[0].html.includes('attacker.example') && !messages[0].html.includes('WelcomeTest123'))
  assert.ok(!JSON.stringify(created.data).includes('password_hash'))
  const row = (await client.execute({sql:'SELECT * FROM customer_welcome_emails WHERE account_id=?',args:[created.data.user.id]})).rows[0]
  assert.ok(row.sent_at)
  await request('/api/account/register',registration('welcome@example.test'),409)
  await request('/api/account/login',{email:'welcome@example.test',password:'WelcomeTest123'},200)
  assert.equal((await emails()).length,1,'registration retry or login must not duplicate the welcome email')
  await fs.writeFile(failurePath,'fail')
  const deferred = await request('/api/account/register',registration('deferred@example.test'),201)
  const deferredCookie = deferred.response.headers.get('set-cookie').split(';')[0]
  await request('/api/account/session',null,200,deferredCookie,'GET')
  const pending = (await client.execute({sql:'SELECT * FROM customer_welcome_emails WHERE account_id=?',args:[deferred.data.user.id]})).rows[0]
  assert.equal(pending.sent_at,null)
  assert.equal(pending.last_error,'email_delivery_failed')
  await fs.unlink(failurePath)
  await request('/api/account/login',{email:'deferred@example.test',password:'WelcomeTest123'},200)
  assert.equal((await emails()).length,2)
  await request('/api/account/login',{email:'deferred@example.test',password:'WelcomeTest123'},200)
  assert.equal((await emails()).length,2)
  await request('/api/account/register',{...registration('invalid@example.test'),password:'short'},400)
  assert.equal((await emails()).length,2)
  await client.execute('ALTER TABLE customer_welcome_emails RENAME TO qa_saved_welcome')
  await request('/api/account/register',registration('rollback@example.test'),500)
  assert.equal((await client.execute("SELECT COUNT(*) AS n FROM customer_accounts WHERE email='rollback@example.test'")).rows[0].n,0,'account and welcome metadata must commit together')
  await client.execute('ALTER TABLE qa_saved_welcome RENAME TO customer_welcome_emails')

  // Service checks use the same temporary DB and an in-process fake provider.
  process.env.TURSO_DATABASE_URL=databaseURL;process.env.TURSO_AUTH_TOKEN=''
  process.env.RESEND_API_KEY='';process.env.PASSWORD_RESET_ORIGIN=base
  const {dispatchCustomerWelcome}=await import('../src/lib/customer-welcome.js')
  const {default:db}=await import('../src/lib/sqlite-db.js')
  const id=crypto.randomUUID()
  await client.execute({sql:"INSERT INTO customer_accounts (id,email,password_hash,first_name,last_name,active,created_at,updated_at) VALUES (?,?,'qa-unused-hash','Client','Test',1,?,?)",args:[id,'service@example.test',new Date().toISOString(),new Date().toISOString()]})
  await client.execute({sql:'INSERT INTO customer_welcome_emails (account_id,created_at) VALUES (?,?)',args:[id,new Date().toISOString()]})
  let calls=0
  globalThis.fetch=async()=>{calls++;return Response.json({id:'qa_delivery'})}
  await dispatchCustomerWelcome(id)
  assert.equal(calls,0)
  assert.equal((await client.execute({sql:'SELECT sent_at FROM customer_welcome_emails WHERE account_id=?',args:[id]})).rows[0].sent_at,null)
  process.env.RESEND_API_KEY='qa_fake_key';process.env.PASSWORD_RESET_ORIGIN='https://www.exemple.fr'
  await dispatchCustomerWelcome(id)
  assert.equal(calls,0)
  assert.equal((await client.execute({sql:'SELECT last_error FROM customer_welcome_emails WHERE account_id=?',args:[id]})).rows[0].last_error,'email_configuration_incomplete')
  process.env.PASSWORD_RESET_ORIGIN=base
  await client.execute({sql:'UPDATE customer_accounts SET active=0 WHERE id=?',args:[id]})
  await dispatchCustomerWelcome(id)
  assert.equal(calls,0)
  await client.execute({sql:'UPDATE customer_accounts SET active=1 WHERE id=?',args:[id]})
  await dispatchCustomerWelcome(id);await dispatchCustomerWelcome(id)
  assert.equal(calls,1)
  db.close()
  assert.ok(!logs.includes('WelcomeTest123'))
  console.log('PASS: welcome after signup, correct recipient/sender, safe content/links, no duplicate, account survives email outage, retry on login, atomic metadata, no provider/config false-success, disabled-account exclusion. No real emails.')
} catch(error) { console.error(logs);throw error }
finally {
  client.close()
  if(server.exitCode===null){const exited=once(server,'exit');server.kill();await exited}
  if(!path.resolve(directory).startsWith(path.join(os.tmpdir(),'oa-welcome-http-')))throw Error('Unsafe QA directory')
  await fs.rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100})
}

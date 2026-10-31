// Disposable production server. No real accounts, payments or email.
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createClient } from '@libsql/client'
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'oa-access-test-'))
const socket = net.createServer()
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve))
const port = socket.address().port
await new Promise(resolve => socket.close(resolve))
const base = `http://127.0.0.1:${port}`
const secret = crypto.randomBytes(32).toString('hex')
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
  env: { ...process.env, TURSO_DATABASE_URL: `file:${path.join(directory,'qa.sqlite').replaceAll('\\','/')}`, TURSO_AUTH_TOKEN: '', JWT_SECRET: secret, CUSTOMER_JWT_SECRET: secret, RESEND_API_KEY: '', STRIPE_SECRET_KEY: '', ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: crypto.randomBytes(24).toString('hex') },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
server.stdout.on('data', d => { logs += d }); server.stderr.on('data', d => { logs += d })
const db = createClient({ url: `file:${path.join(directory,'qa.sqlite').replaceAll('\\','/')}` })
async function request(route, { method='GET', body, cookie, bearer, status=200 }={}) {
  const response = await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(bearer?{Authorization:`Bearer ${bearer}`}:{})},...(body?{body:JSON.stringify(body)}:{})})
  const text = await response.text()
  assert.equal(response.status,status,`${method} ${route}: ${text}`)
  return {response,data:text?JSON.parse(text):null,text}
}
try {
  let ready=false
  for(let n=0;n<100;n++){
    try{if((await fetch(base+'/api/realisations')).ok){ready=true;break}}catch{}
    if(server.exitCode!==null)throw Error(logs)
    await new Promise(resolve=>setTimeout(resolve,200))
  }
  assert.ok(ready,logs)
  const users=[]
  for(const name of ['Alice','Bob']){
    const signup=await request('/api/account/register',{method:'POST',body:{firstName:name,lastName:'Test',email:`${name.toLowerCase()}@example.test`,password:'AccessTest123',phone:'0612345678'},status:201})
    users.push({id:signup.data.user.id,cookie:signup.response.headers.get('set-cookie').split(';')[0]})
    assert.ok(!signup.text.includes('password_hash'))
  }
  const [alice,bob]=users
  await request('/api/account/profile',{status:401})
  const own=await request(`/api/account/profile?id=${bob.id}&email=bob@example.test`,{cookie:alice.cookie})
  assert.equal(own.data.user.id,alice.id)
  await request('/api/account/profile',{method:'PUT',cookie:alice.cookie,body:{id:bob.id,email:'bob@example.test',firstName:'Alice modifiée',lastName:'Test',phone:'0612345678',active:0,role:'authenticated'}})
  assert.equal((await request('/api/account/profile',{cookie:bob.cookie})).data.user.firstName,'Bob')
  assert.equal((await request('/api/account/profile',{cookie:alice.cookie})).data.user.email,'alice@example.test')
  const forged=alice.cookie.slice(0,-1)+(alice.cookie.endsWith('a')?'b':'a')
  await request('/api/account/profile',{cookie:forged,status:401})
  for(const cookie of [undefined,alice.cookie]){
    const bearer=cookie?.split('=')[1]
    for(const table of ['reservations','payments','contacts','settings'])await request(`/api/db?table=${table}`,{cookie,bearer,status:401})
    await request('/api/admin/accounts',{cookie,bearer,status:401})
    await request('/api/realisations',{method:'POST',body:{},cookie,bearer,status:401})
    await request('/api/db?table=site_content',{method:'PUT',body:{payload:{value:'overwrite'},filters:[{type:'eq',field:'key',value:'test'}]},cookie,bearer,status:401})
    await request('/api/upload',{method:'POST',body:{},cookie,bearer,status:401})
    await request('/api/reservations/notify',{method:'POST',body:{},cookie,bearer,status:401})
  }
  await request('/api/db?table=customer_accounts',{cookie:alice.cookie,status:400})
  await db.execute("INSERT INTO reservations (id,reference,date,dates,materials,prenom,nom,email,phone,status,delivery_address,created_at) VALUES ('qa-private','OA-QAPRIV','2099-12-01','[\"2099-12-01\"]','[]','Bob','Test','bob@example.test','0612345678','confirmed','Adresse privée de Bob','2026-10-31T00:00:00Z')")
  const missing=await request('/api/track',{method:'POST',cookie:alice.cookie,body:{reference:'OA-QAPRIV',email:'alice@example.test'},status:404})
  const unknown=await request('/api/track',{method:'POST',body:{reference:'OA-NONE00',email:'bob@example.test'},status:404})
  assert.equal(missing.text,unknown.text)
  await request('/api/track',{method:'POST',body:{reference:'OA-QAPRIV'},status:400})
  const publicData=await request('/api/reservations/public')
  for(const secretValue of ['bob@example.test','Adresse privée de Bob','0612345678','OA-QAPRIV','qa-private'])assert.ok(!publicData.text.includes(secretValue))
  const tracked=await request('/api/track',{method:'POST',body:{reference:'OA-QAPRIV',email:'bob@example.test'}})
  assert.equal(tracked.data.data.status,'confirmed')
  assert.ok(!tracked.text.includes('password_hash'))
  await db.execute({sql:'UPDATE customer_accounts SET active=0 WHERE id=?',args:[alice.id]})
  await request('/api/account/profile',{cookie:alice.cookie,status:401})
  await request('/api/account/session',{cookie:alice.cookie,status:401})
  console.log('PASS: two-client isolation, forged/disabled sessions rejected, profile target injection blocked, customer token cannot authorize admin routes, private tables protected, tracking requires email + reference, public availability excludes personal data.')
} catch(error){console.error(logs);throw error}
finally{
  db.close()
  if(server.exitCode===null){const exited=once(server,'exit');server.kill();await exited}
  if(!path.resolve(directory).startsWith(path.join(os.tmpdir(),'oa-access-test-')))throw Error('Unsafe QA directory')
  await fs.rm(directory,{recursive:true,force:true,maxRetries:10,retryDelay:200})
}

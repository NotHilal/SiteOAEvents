// Run after npm run build. Page editor (Espace OA > Contenu des pages) on a
// disposable database: defaults, legacy content, validation, auth, publish.
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import net from 'node:net'
import { createTestDatabase, sqlClient } from './lib/test-db.mjs'
import { resolveContent } from '../src/lib/cms/resolve.js'

const testDb = await createTestDatabase()
const db = sqlClient(testDb.url)
const socket = net.createServer()
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve))
const port = socket.address().port
await new Promise(resolve => socket.close(resolve))
const base = `http://localhost:${port}`
const secret = crypto.randomBytes(32).toString('hex')
const payload = Buffer.from(JSON.stringify({ role: 'authenticated', exp: Date.now() + 3600000 })).toString('base64url')
const token = `${payload}.${crypto.createHmac('sha256', secret).update(payload).digest('base64url')}`
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
  env: { ...process.env, DATABASE_URL: testDb.url, JWT_SECRET: secret },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
server.stdout.on('data', data => { logs += data })
server.stderr.on('data', data => { logs += data })

async function admin(method, query, body, expected = 200, auth = true) {
  const response = await fetch(`${base}/api/admin/pages${query}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const json = await response.json()
  assert.equal(response.status, expected, JSON.stringify(json))
  return json.data
}

async function page(path) {
  const response = await fetch(base + path)
  assert.equal(response.status, 200, path)
  const html = await response.text()
  const data = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  assert.ok(data, `Missing page props on ${path}`)
  return { html: html.split('<script id="__NEXT_DATA__"')[0], props: JSON.parse(data[1]).props.pageProps }
}

try {
  let ready = false
  for (let n = 0; n < 100; n++) {
    try { if ((await fetch(`${base}/api/page-content?page=global`)).ok) { ready = true; break } } catch {}
    if (server.exitCode !== null) throw new Error(logs)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  assert.ok(ready, logs)

  // Untouched site: the original copy.
  const home = await page('/')
  assert.equal(home.props.cms.hero.title, resolveContent('home').hero.title)
  assert.match(home.html, /Location de matériel événementiel dans toute la France/)
  assert.match(home.html, /data-cms="home:hero.title"/)
  assert.equal((await page('/faq')).props.cms.groups.items.length, 4)

  // Admin only.
  await admin('GET', '?page=home', null, 401, false)
  await admin('PUT', '', { page: 'home', content: home.props.cms }, 401, false)
  await admin('GET', '?page=nope', null, 404)

  // Content saved by the old À propos editor is kept until the first publish.
  await db.execute({ sql: "INSERT INTO site_content (key, value, updated_at) VALUES ('about_page', ?, now()) ON CONFLICT (key) DO UPDATE SET value = excluded.value", args: [JSON.stringify({ headline: 'Ancien titre', story: 'Ancienne histoire', counters: [], values: [] })] })
  const about = await admin('GET', '?page=about')
  assert.equal(about.content.intro.headline, 'Ancien titre')
  assert.equal(about.updatedAt, null)

  // Publish.
  const draft = structuredClone(home.props.cms)
  draft.hero.title = 'Titre <modifié> & publié'
  draft.selection.title = 'Notre *nouvelle* sélection'
  draft.steps.items = draft.steps.items.slice(0, 2)
  const saved = await admin('PUT', '', { page: 'home', content: draft })
  assert.equal(saved.content.hero.title, 'Titre <modifié> & publié')
  assert.ok(saved.updatedAt)
  const after = await page('/')
  assert.match(after.html, /Titre &lt;modifié&gt; &amp; publié/)
  assert.match(after.html, /Notre <em>nouvelle<\/em> sélection/)
  assert.equal((after.html.match(/class="oa-step"/g) || []).length, 2)
  // The home FAQ shows the FAQ page's questions marked for it (defaults: 4).
  assert.match(after.html, /Quel matériel événementiel peut-on louer \?/)
  assert.ok(!/Faut-il créer un compte/.test(after.html))

  // Validation.
  const invalid = structuredClone(draft)
  invalid.banner.image = 'javascript:alert(1)'
  await admin('PUT', '', { page: 'home', content: invalid }, 400)
  const missing = structuredClone(draft)
  missing.hero.title = '   '
  await admin('PUT', '', { page: 'home', content: missing }, 400)
  const tooMany = structuredClone(draft)
  tooMany.assurances.items.push({ title: 'Cinq', tag: '' })
  await admin('PUT', '', { page: 'home', content: tooMany }, 400)

  // Header / footer / coordinates on every page.
  const global = (await admin('GET', '?page=global')).content
  global.header.tagline = 'Accroche de test'
  global.contact.email = 'test@example.com'
  global.social.instagram = 'https://instagram.com/oa'
  global.delivery.zone = 'Zone de test'
  global.delivery.text = 'Texte livraison partagé'
  await admin('PUT', '', { page: 'global', content: global })
  // Pages rendered on the server carry it in their HTML; the others load it on display.
  for (const path of ['/', '/contact', '/a-propos', '/faq', '/nos-realisations']) {
    const { html } = await page(path)
    assert.match(html, /Accroche de test/, path)
    assert.match(html, /test@example\.com/, path)
    assert.match(html, /instagram\.com\/oa/, path)
    assert.match(html, /Zone de test/, path)
    assert.ok(!/contact@oa-evenementiel\.fr/.test(html), `Old e-mail still on ${path}`)
  }
  // One delivery text: footer and home column.
  assert.equal(((await page('/')).html.match(/Texte livraison partagé/g) || []).length, 2)
  // Google business data follows the coordinates.
  assert.match((await page('/contact')).html, /"email":"test@example\.com"/)
  assert.match((await page('/contact')).html, /"sameAs":\["https:\/\/instagram\.com\/oa"\]/)
  // Legal pages load them in the browser from the same source.
  assert.match((await page('/mentions-legales')).html, /8 rue de la Butte des Groux, 78570 Chanteloup-les-Vignes/)
  const publicGlobal = await (await fetch(`${base}/api/page-content?page=global`)).json()
  assert.equal(publicGlobal.data.header.tagline, 'Accroche de test')

  // Other pages.
  const contact = (await admin('GET', '?page=contact')).content
  contact.header.title = 'Écrivez-nous'
  await admin('PUT', '', { page: 'contact', content: contact })
  assert.match((await page('/contact')).html, /Écrivez-nous/)
  const faq = (await admin('GET', '?page=faq')).content
  faq.groups.items = [{ h: 'Rubrique unique', items: [{ q: 'Une seule question ?', a: 'Oui.', home: true }, { q: 'Question de la FAQ seule ?', a: 'Oui.', home: false }] }]
  await admin('PUT', '', { page: 'faq', content: faq })
  const faqPage = await page('/faq')
  assert.match(faqPage.html, /Rubrique unique/)
  assert.match(faqPage.html, /Question de la FAQ seule/)
  assert.ok(!/Faut-il créer un compte/.test(faqPage.html))
  // Edited once on the FAQ page, updated on the home page too.
  const homeAfterFaq = (await page('/')).html
  assert.match(homeAfterFaq, /Une seule question \?/)
  assert.ok(!/Question de la FAQ seule/.test(homeAfterFaq))
  assert.ok(!/Quel matériel événementiel peut-on louer/.test(homeAfterFaq))

  console.log('PASS: page editor defaults, legacy À propos content, admin auth, publish on home/contact/FAQ, shared sources (home FAQ from the FAQ page, one delivery text, coordinates in header/footer/Google data), header/footer on every page, validation (photos, required, list sizes) and escaping.')
} catch (error) {
  console.error(logs)
  throw error
} finally {
  server.kill()
  await once(server, 'exit').catch(() => {})
  await db.close()
  await testDb.drop()
}

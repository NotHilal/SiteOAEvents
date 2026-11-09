// Run after npm run build. CMS writes and page reads use a disposable database.
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import net from 'node:net'
import { createTestDatabase, sqlClient } from './lib/test-db.mjs'

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

async function action(action, data, expected = 200) {
  const response = await fetch(`${base}/api/admin/catalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...data }),
  })
  const json = await response.json()
  assert.equal(response.status, expected, JSON.stringify(json))
  return json.data
}

async function page(path) {
  const response = await fetch(base + path)
  assert.equal(response.status, 200)
  const html = await response.text()
  const data = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  assert.ok(data, `Missing page props on ${path}`)
  return { html, props: JSON.parse(data[1]).props.pageProps }
}

async function checkSync() {
  const response = await fetch(`${base}/api/catalogue/categories`)
  assert.equal(response.status, 200)
  const { data: categories } = await response.json()
  const home = await page('/')
  const catalogue = await page('/catalogue')
  const tilesResponse = await fetch(`${base}/api/admin/home-tiles`, { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(tilesResponse.status, 200)
  const { data: { tiles } } = await tilesResponse.json()
  assert.deepEqual(home.props.categories, tiles)
  for (const tile of tiles) {
    const category = categories.find(c => c.id === tile.categoryId)
    assert.ok(category)
    assert.equal(tile.image_url, category.image_url)
    assert.equal(tile.name, category.name)
    assert.equal(tile.label, tile.title || category.label)
  }
  assert.deepEqual(catalogue.props.tiles, categories.map(c => ({
    key: c.id, value: c.name, label: c.label, img: c.image_url, text: c.description,
  })))
  assert.equal((home.html.match(/class="oa-home-cat(?: is-tall)?"/g) || []).length, tiles.length)
  assert.equal((catalogue.html.match(/class="oa-cat-tile"/g) || []).length, categories.length)
  // Check the rendered tiles as well as their props, excluding the JSON script.
  const homeMarkup = home.html.split('<script id="__NEXT_DATA__"')[0]
  const catalogueMarkup = catalogue.html.split('<script id="__NEXT_DATA__"')[0]
  for (const c of categories) {
    if (c.image_url) {
      if (tiles.some(t => t.categoryId === c.id)) assert.ok(homeMarkup.includes(c.image_url), `Missing homepage photo: ${c.label}`)
      assert.ok(catalogueMarkup.includes(c.image_url), `Missing catalogue photo: ${c.label}`)
    }
  }
  return categories
}

try {
  let ready = false
  for (let n = 0; n < 100; n++) {
    try { if ((await fetch(`${base}/api/catalogue/categories`)).ok) { ready = true; break } } catch {}
    if (server.exitCode !== null) throw new Error(logs)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  assert.ok(ready, logs)
  const initial = await checkSync()
  assert.equal((await fetch(`${base}/api/admin/home-tiles`)).status, 401)
  const defaults = (await page('/')).props.categories
  assert.equal(defaults.length, 5)
  assert.ok(defaults.some(t => t.name === 'TENTES' && t.label === 'Tentes de réception'))
  assert.ok(!defaults.some(t => t.name === 'DÉCORATIONS'))
  assert.ok(initial.some(c => c.name === 'DÉCORATIONS'), 'Decorations remain in the catalogue')
  const chair = initial.find(c => c.name === 'CHAISES')
  await action('saveCategory', { id: chair.id, title: 'Chaises de cérémonie', description: chair.description, image: chair.image_url })
  assert.ok((await page('/')).props.categories.some(t => t.id === chair.id && t.label === 'Chaises de cérémonie'), 'Default tile follows category rename by ID')
  const { id } = await action('saveCategory', { title: 'Catégorie de test', description: 'Nouvelle catégorie', image: '/pics/chaises-napoleon.jpg' })
  assert.ok((await checkSync()).some(c => c.id === id))
  await action('saveHomeTiles', { tiles: [...initial.map(c => ({ categoryId: c.id })), { categoryId: id, title: 'Tuile personnalisée' }] })
  assert.ok((await page('/')).props.categories.length > 5, 'Custom layout exercises multiple mosaic rows')
  await action('saveHomeTiles', { tiles: [{ categoryId: id }, { categoryId: id }] }, 400)
  await action('saveHomeTiles', { tiles: [{ categoryId: 'missing-category' }] }, 409)
  await action('saveHomeTiles', { tiles: [{ categoryId: id }], photo: { categoryId: id, image: 'javascript:invalid' } }, 400)
  await action('saveCategory', { id, title: 'Mobilier renommé', description: 'Description modifiée', image: '/pics/table-ronde-152.jpg' })
  let categories = await checkSync()
  assert.equal(categories.find(c => c.id === id).label, 'Mobilier renommé')
  assert.equal(categories.find(c => c.id === id).image_url, '/pics/table-ronde-152.jpg')
  await action('saveHomeTiles', {
    tiles: [{ categoryId: id, title: 'Titre accueil uniquement' }, { categoryId: initial[0].id }],
    photo: { categoryId: id, image: '/pics/chaises-napoleon.jpg' },
  })
  await checkSync()
  let homeTiles = (await page('/')).props.categories
  assert.equal(homeTiles[0].label, 'Titre accueil uniquement')
  assert.equal(homeTiles[0].image_url, '/pics/chaises-napoleon.jpg')
  assert.equal((await page('/catalogue')).props.tiles.find(c => c.key === id).label, 'Mobilier renommé')
  await action('saveHomeTiles', { tiles: [{ categoryId: initial[0].id }, { categoryId: id, title: 'Titre accueil uniquement' }] })
  assert.equal((await page('/')).props.categories[0].id, initial[0].id)
  await action('reorderCategories', { ids: [id, ...initial.map(c => c.id)] })
  assert.equal((await checkSync())[0].id, id)
  // A legacy homepage override must never hide the current category image.
  await db.execute({ sql: "UPDATE site_content SET value = ? WHERE key = 'images_home'", args: [JSON.stringify({ categorie_1: '/pics/obsolete-category.jpg' })] })
  await checkSync()
  await action('deleteCategory', { id })
  assert.ok(!(await checkSync()).some(c => c.id === id))
  // Exercise short and empty catalogues without touching the preview database.
  await db.execute({ sql: 'DELETE FROM categories WHERE id <> ?', args: [initial[0].id] })
  assert.equal((await checkSync()).length, 1)
  await db.execute('DELETE FROM categories')
  assert.equal((await checkSync()).length, 0)
  console.log('PASS: editable home tiles default to reception tents; catalogue decorations preserved; shared photos, independent home titles/selection/order, validation/auth, deleted categories, legacy overrides and short/empty layouts.')
} catch (error) {
  console.error(logs)
  throw error
} finally {
  server.kill()
  await once(server, 'exit').catch(() => {})
  await db.close()
  await testDb.drop()
}

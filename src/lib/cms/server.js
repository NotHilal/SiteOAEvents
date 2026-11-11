import db from '../db/index.js'
import { deleteUploadIfUnused } from '../admin-catalog.js'
import { getCmsPage } from './schema.js'
import { LEGACY_KEYS, resolveContent, sanitizeContent } from './resolve.js'

// Server-only. Reads / writes the editable page content (site_content rows
// cms_<page>). A failing read never breaks a page: it renders the defaults.

async function readRows(keys) {
  if (!keys.length) return {}
  const rows = await db.prepare(`SELECT key, value, updated_at FROM site_content WHERE key IN (${keys.map(() => '?').join(', ')})`).all(...keys)
  return Object.fromEntries(rows.map(r => [r.key, r]))
}

export async function getPageContent(pageId) {
  const page = getCmsPage(pageId)
  if (!page) throw Object.assign(new Error('Page inconnue.'), { status: 404 })
  try {
    const legacyKeys = LEGACY_KEYS[pageId] || []
    const rows = await readRows([page.key, ...legacyKeys])
    let saved = null
    try { saved = rows[page.key] ? JSON.parse(rows[page.key].value) : null } catch {}
    const legacy = Object.fromEntries(legacyKeys.map(k => [k, rows[k]?.value ?? null]))
    return resolveContent(pageId, saved, legacy)
  } catch (error) {
    console.error('[cms]', pageId, error)
    return resolveContent(pageId, null, null)
  }
}

// For getServerSideProps: { cms, cmsGlobal } of a page.
export async function getPageProps(pageId) {
  const [cms, cmsGlobal] = await Promise.all([getPageContent(pageId), getPageContent('global')])
  return { cms, cmsGlobal }
}

export async function getPageMeta(pageId) {
  const page = getCmsPage(pageId)
  const row = page && (await readRows([page.key]))[page.key]
  return { updatedAt: row?.updated_at ? new Date(row.updated_at).toISOString() : null }
}

export async function savePageContent(pageId, input) {
  const page = getCmsPage(pageId)
  if (!page) throw Object.assign(new Error('Page inconnue.'), { status: 404 })
  const clean = sanitizeContent(pageId, input)
  const json = JSON.stringify(clean)
  if (json.length > 300000) throw Object.assign(new Error('Contenu trop volumineux.'), { status: 400 })
  const before = (await readRows([page.key]))[page.key]
  await db.prepare('INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, now()) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now()').run(page.key, json)
  // Photos replaced in this page are deleted once nothing uses them.
  const old = String(before?.value || '').match(/\/uploads\/[a-zA-Z0-9_./-]+/g) || []
  for (const url of new Set(old)) if (!json.includes(url)) await deleteUploadIfUnused(url)
  return { content: await getPageContent(pageId), ...(await getPageMeta(pageId)) }
}

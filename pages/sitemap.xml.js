import { getRealisations } from '../src/lib/realisations-server.js'
import { SITE_URL, PUBLIC_PAGES } from '../src/lib/site.js'
import db from '../src/lib/sqlite-db.js'

// Generated on request from PUBLIC_PAGES (src/lib/site.js) — add a page
// there and it appears here — plus one URL per catalogue product (its
// canonical /catalogue/[slug]; variants share their product's page).
// Private/technical routes are never listed.
async function productPages() {
  try {
    const rows = await db.prepare(
      `SELECT DISTINCT COALESCE(p.slug, m.slug) AS slug FROM materials m
       LEFT JOIN products p ON p.id = m.product_id
       WHERE m.available = 1 AND COALESCE(p.slug, m.slug) IS NOT NULL`
    ).all()
    return rows.map(r => ({ path: `/catalogue/${r.slug}`, priority: 0.6, changefreq: 'weekly' }))
  } catch {
    return []
  }
}

function buildSitemap(pages) {
  const urls = pages.map(p => `  <url>
    <loc>${SITE_URL}${p.path === '/' ? '/' : p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority.toFixed(1)}</priority>
  </url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

export async function getServerSideProps({ res }) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
  const realisations = await getRealisations()
  res.write(buildSitemap([...PUBLIC_PAGES, ...(await productPages()), ...realisations.map(item => ({ path: `/nos-realisations/${item.slug}`, priority: 0.6, changefreq: 'monthly' }))]))
  res.end()
  return { props: {} }
}

export default function Sitemap() {
  return null
}

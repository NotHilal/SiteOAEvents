import { SITE_URL, PUBLIC_PAGES } from '../src/lib/site.js'

// Generated on request from PUBLIC_PAGES (src/lib/site.js) — add a page
// there and it appears here. Private/technical routes are never listed.
function buildSitemap() {
  const urls = PUBLIC_PAGES.map(p => `  <url>
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
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')
  res.write(buildSitemap())
  res.end()
  return { props: {} }
}

export default function Sitemap() {
  return null
}

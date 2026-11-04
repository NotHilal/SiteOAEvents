import { getRealisations } from '../src/lib/realisations-server.js'
import { getCatalogueCards } from '../src/lib/catalogue-cards.js'
import { catalogueCategoryHref } from '../src/components/product/productUtils.js'
import { SITE_URL, PUBLIC_PAGES } from '../src/lib/site.js'
import { EVENTS, GUIDES } from '../src/lib/seo/landings.js'

// Generated on request from PUBLIC_PAGES (src/lib/site.js) plus the catalogue
// (categories and products at their canonical URLs; variants share their
// product's page), the zone, occasion and guide pages, and every réalisation.
// Products and réalisations list their photos (Google image sitemap). No
// priority/changefreq: Google ignores them. lastmod only where a real date is
// known. Private/technical routes are never listed.

const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
const absolute = src => (/^https?:\/\//.test(src) ? src : `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`)
// SQLite's "YYYY-MM-DD HH:MM:SS" (UTC) or an ISO string → W3C date.
const w3cDate = value => {
  const d = value ? new Date(/Z|[+-]\d\d:?\d\d$/.test(value) ? value : `${String(value).replace(' ', 'T')}Z`) : null
  return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null
}

async function cataloguePages() {
  try {
    const { cards, categories } = await getCatalogueCards()
    const used = new Set(cards.map(c => c.category))
    return [
      ...categories.filter(c => used.has(c.name)).map(c => ({ path: catalogueCategoryHref(c.name) })),
      ...cards.map(card => ({
        path: `/catalogue/${card.slug}`,
        images: [...new Set(card.variants.flatMap(v => v.images))].slice(0, 10).map(src => ({ src })),
      })),
    ]
  } catch {
    return []
  }
}

async function realisationPages() {
  try {
    return (await getRealisations()).map(item => ({
      path: `/nos-realisations/${item.slug}`,
      lastmod: w3cDate(item.updatedAt),
      images: [{ src: item.cover }, ...item.media.filter(m => m.type === 'image').map(m => ({ src: m.src }))].slice(0, 10),
    }))
  } catch {
    return []
  }
}

const contentPages = [
  ...EVENTS.map(e => ({ path: `/evenements/${e.slug}`, images: [{ src: e.image }] })),
  ...GUIDES.map(g => ({ path: `/guides/${g.slug}`, lastmod: g.updated || g.published, images: [{ src: g.image }] })),
]

function buildSitemap(pages) {
  const urls = pages.map(p => [
    '  <url>',
    `    <loc>${xml(`${SITE_URL}${p.path === '/' ? '/' : p.path}`)}</loc>`,
    p.lastmod && `    <lastmod>${p.lastmod}</lastmod>`,
    ...(p.images || []).filter(i => i.src).map(i => `    <image:image><image:loc>${xml(absolute(i.src))}</image:loc></image:image>`),
    '  </url>',
  ].filter(Boolean).join('\n')).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`
}

export async function getServerSideProps({ res }) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
  const [catalogue, realisations] = await Promise.all([cataloguePages(), realisationPages()])
  // An empty réalisations page is noindex (see pages/nos-realisations/index.jsx).
  const staticPages = [...PUBLIC_PAGES, ...(realisations.length ? ['/nos-realisations'] : [])].map(path => ({ path }))
  res.write(buildSitemap([...staticPages, ...contentPages, ...catalogue, ...realisations]))
  res.end()
  return { props: {} }
}

export default function Sitemap() {
  return null
}

import { getRealisations } from '../src/lib/realisations-server.js'
import { getCatalogueCards } from '../src/lib/catalogue-cards.js'
import { catalogueCategoryHref } from '../src/components/product/productUtils.js'
import { SITE_URL, PUBLIC_PAGES } from '../src/lib/site.js'

// Generated on request from PUBLIC_PAGES (src/lib/site.js) — add a page
// there and it appears here — plus the catalogue (its next pages, one URL
// per category filter and per product, at their canonical URLs; variants
// share their product's page) and every réalisation. Products and
// réalisations list their photos (Google image sitemap) so they can show
// up in image search. Private/technical routes are never listed.

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
      { path: '/catalogue/complet', priority: 0.8, changefreq: 'weekly' },
      ...categories.filter(c => used.has(c.name)).map(c => ({ path: catalogueCategoryHref(c.name), priority: 0.8, changefreq: 'weekly' })),
      ...cards.map(card => ({
        path: `/catalogue/${card.slug}`,
        priority: 0.7,
        changefreq: 'weekly',
        images: [...new Set(card.variants.flatMap(v => v.images))].slice(0, 10).map(src => ({ src, title: card.name })),
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
      priority: 0.6,
      changefreq: 'monthly',
      lastmod: w3cDate(item.updatedAt),
      images: [{ src: item.cover, title: item.title }, ...item.media.filter(m => m.type === 'image').map(m => ({ src: m.src, title: m.caption || item.title }))].slice(0, 10),
    }))
  } catch {
    return []
  }
}

function buildSitemap(pages) {
  const urls = pages.map(p => [
    '  <url>',
    `    <loc>${xml(`${SITE_URL}${p.path === '/' ? '/' : p.path}`)}</loc>`,
    p.lastmod && `    <lastmod>${p.lastmod}</lastmod>`,
    `    <changefreq>${p.changefreq}</changefreq>`,
    `    <priority>${p.priority.toFixed(1)}</priority>`,
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
  res.write(buildSitemap([...PUBLIC_PAGES, ...catalogue, ...realisations]))
  res.end()
  return { props: {} }
}

export default function Sitemap() {
  return null
}

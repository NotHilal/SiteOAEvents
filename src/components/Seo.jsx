import Head from 'next/head'
import { SITE } from '../lib/site.js'

// Per-page SEO: unique title + description, canonical URL, Open Graph /
// Twitter card, optional robots noindex and JSON-LD blocks.
//
// `breadcrumb` — array of { name, path } after "Accueil"; emits a
// BreadcrumbList so search results can show the page's place in the site.
// `preloadImage` — URL of the page's above-the-fold hero image when it's a
// CSS background (invisible to the browser's preload scanner otherwise).
export default function Seo({ title, description, path = '/', image, noindex = false, breadcrumb, jsonLd, preloadImage }) {
  const url = `${SITE.url}${path === '/' ? '/' : path}`
  const fullTitle = title.includes(SITE.name) ? title : `${title} | ${SITE.name}`
  const img = image || SITE.ogImage

  const blocks = []
  if (breadcrumb?.length) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [{ name: 'Accueil', path: '/' }, ...breadcrumb].map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.name,
        item: `${SITE.url}${b.path}`,
      })),
    })
  }
  if (jsonLd) blocks.push(...(Array.isArray(jsonLd) ? jsonLd : [jsonLd]))

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      {preloadImage && <link rel="preload" as="image" href={preloadImage} fetchPriority="high" />}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:locale" content={SITE.locale} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${SITE.name} — organisation d'événements et location de décoration`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />

      {blocks.map((b, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(b).replace(/</g, '\\u003c') }} />
      ))}
    </Head>
  )
}

// Organization + WebSite, for the homepage only. Only facts the site
// already states — no address, ratings or reviews invented.
export const ORGANIZATION_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    logo: SITE.logo,
    email: SITE.email,
    description: SITE.description,
    areaServed: { '@type': 'AdministrativeArea', name: SITE.region },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    inLanguage: 'fr-FR',
  },
]

import Head from 'next/head'
import { SITE } from '../lib/site.js'

// Per-page SEO: unique title + description, canonical URL, Open Graph /
// Twitter card, optional robots noindex and JSON-LD blocks.
//
// `breadcrumb` — array of { name, path } after "Accueil"; emits a
// BreadcrumbList so search results can show the page's place in the site.
// `preloadImage` — URL of the page's above-the-fold hero image when it's a
// CSS background (invisible to the browser's preload scanner otherwise).
// `type` — Open Graph type: 'website' by default, 'article' for a
// réalisation, 'product' for a catalogue item.
export default function Seo({ title, description, path = '/', image, imageAlt, type = 'website', noindex = false, breadcrumb, jsonLd, preloadImage }) {
  const url = `${SITE.url}${path === '/' ? '/' : path}`
  // The brand is dropped when it would push the keywords out of the ~70
  // characters search results display.
  const withBrand = `${title} | ${SITE.name}`
  const fullTitle = title.includes(SITE.name) || withBrand.length > 72 ? title : withBrand
  const img = absoluteUrl(image) || SITE.ogImage
  // Only the default share image is known to be 1200×630.
  const isDefaultImage = img === SITE.ogImage

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
  if (jsonLd) blocks.push(...(Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean))

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'} />
      {preloadImage && <link rel="preload" as="image" href={preloadImage} fetchPriority="high" />}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:locale" content={SITE.locale} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      {isDefaultImage && <meta property="og:image:width" content="1200" />}
      {isDefaultImage && <meta property="og:image:height" content="630" />}
      <meta property="og:image:alt" content={imageAlt || (isDefaultImage ? `${SITE.name} — location de matériel événementiel en ${SITE.region}` : title)} />

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

// Site-relative paths (/uploads/…) → absolute URLs, as Open Graph and
// schema.org require.
export function absoluteUrl(src) {
  if (!src) return ''
  return /^https?:\/\//.test(src) ? src : `${SITE.url}${src.startsWith('/') ? '' : '/'}${src}`
}

export const ORGANIZATION_ID = `${SITE.url}/#organization`

const DEPARTMENTS = ['Paris', 'Yvelines', 'Hauts-de-Seine', 'Val-d’Oise', 'Essonne', 'Seine-Saint-Denis', 'Val-de-Marne', 'Seine-et-Marne']

// Reference to the business from another JSON-LD block.
export const PROVIDER_LD = { '@type': 'LocalBusiness', '@id': ORGANIZATION_ID, name: SITE.name, url: SITE.url }

// The business, on the homepage and the contact page. Only verifiable facts
// (Kbis, contact page) — never invent ratings or reviews: add aggregateRating
// only once real reviews are displayed on the site.
export const LOCAL_BUSINESS_LD = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': ORGANIZATION_ID,
  name: SITE.name,
  legalName: SITE.legalName,
  url: SITE.url,
  logo: SITE.logo,
  image: SITE.ogImage,
  email: SITE.email,
  ...(SITE.phone ? { telephone: SITE.phone } : {}),
  description: SITE.description,
  foundingDate: SITE.foundingDate,
  identifier: { '@type': 'PropertyValue', propertyID: 'SIREN', value: SITE.siren },
  address: {
    '@type': 'PostalAddress',
    streetAddress: SITE.address.street,
    postalCode: SITE.address.postalCode,
    addressLocality: SITE.address.city,
    addressRegion: SITE.region,
    addressCountry: SITE.address.country,
  },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    ...SITE.openingHours,
  },
  areaServed: [{ '@type': 'AdministrativeArea', name: SITE.region }, ...DEPARTMENTS.map(name => ({ '@type': 'AdministrativeArea', name }))],
  paymentAccepted: 'Carte bancaire',
  currenciesAccepted: 'EUR',
  knowsAbout: ['Location de matériel événementiel', 'Location de mobilier de réception', 'Location de tentes de réception', 'Décoration de mariage', 'Art de la table'],
  ...(Object.values(SITE.social).some(Boolean) ? { sameAs: Object.values(SITE.social).filter(Boolean) } : {}),
}

export const WEBSITE_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE.url}/#website`,
  name: SITE.name,
  url: SITE.url,
  inLanguage: 'fr-FR',
  publisher: { '@id': ORGANIZATION_ID },
}

// FAQ text may hold [label](/path) links: plain text for structured data.
const plainText = text => text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

export const faqLd = items => (items?.length ? {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: plainText(a) } })),
} : null)

// Meta description of at most `max` characters, cut between two words.
export function clampDescription(text, max = 160) {
  const clean = String(text || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).replace(/[\s,;:.–-]+\S*$/, '')}…`
}

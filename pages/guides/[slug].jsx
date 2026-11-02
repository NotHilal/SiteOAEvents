import Link from 'next/link'
import Seo, { ORGANIZATION_ID, absoluteUrl } from '../../src/components/Seo.jsx'
import LandingPage from '../../src/components/seo/LandingPage.jsx'
import { SITE } from '../../src/lib/site.js'
import { GUIDES } from '../../src/lib/seo/landings.js'

const HUB = { name: 'Conseils', path: '/guides' }

export async function getServerSideProps({ params }) {
  const guide = GUIDES.find(g => g.slug === params.slug)
  if (!guide) return { notFound: true }
  const { featuredCards } = await import('../../src/lib/seo/featured-cards.js')
  return { props: { slug: guide.slug, cards: await featuredCards(guide.featured) } }
}

const frenchDate = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export default function Guide({ slug, cards }) {
  const guide = GUIDES.find(g => g.slug === slug)
  const path = `${HUB.path}/${slug}`
  const url = `${SITE.url}${path}`
  const modified = guide.updated || guide.published
  return (
    <>
      <Seo
        title={guide.title}
        description={guide.description}
        path={path}
        type="article"
        image={guide.image}
        imageAlt={guide.imageAlt}
        preloadImage={guide.image}
        breadcrumb={[HUB, { name: guide.title, path }]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: guide.title.slice(0, 110),
          description: guide.description,
          url,
          mainEntityOfPage: url,
          image: [absoluteUrl(guide.image)],
          datePublished: guide.published,
          dateModified: modified,
          inLanguage: 'fr-FR',
          author: { '@type': 'Organization', '@id': ORGANIZATION_ID, name: SITE.name, url: SITE.url },
          publisher: { '@type': 'Organization', '@id': ORGANIZATION_ID, name: SITE.name, logo: { '@type': 'ImageObject', url: SITE.logo } },
        }}
      />
      <LandingPage page={guide} h1={guide.title} crumbs={[HUB, { name: guide.title, path }]} cards={cards} cardsTitle="Le matériel évoqué dans ce guide" cta={false}>
        <p className="seo-page-date">Publié le <time dateTime={guide.published}>{frenchDate(guide.published)}</time> par {SITE.name}</p>
        <nav aria-label="Autres conseils" className="seo-related-links">
          <h2>À lire aussi</h2>
          <ul>{GUIDES.filter(g => g.slug !== slug).map(g => <li key={g.slug}><Link href={`${HUB.path}/${g.slug}`}>{g.title}</Link></li>)}</ul>
        </nav>
      </LandingPage>
    </>
  )
}

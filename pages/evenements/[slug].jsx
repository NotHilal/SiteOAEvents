import Link from 'next/link'
import Seo, { PROVIDER_LD, faqLd } from '../../src/components/Seo.jsx'
import LandingPage from '../../src/components/seo/LandingPage.jsx'
import { SITE } from '../../src/lib/site.js'
import { EVENTS } from '../../src/lib/seo/landings.js'

const HUB = { name: 'Événements', path: '/evenements' }

export async function getServerSideProps({ params }) {
  const event = EVENTS.find(e => e.slug === params.slug)
  if (!event) return { notFound: true }
  const { featuredCards } = await import('../../src/lib/seo/featured-cards.js')
  return { props: { slug: event.slug, cards: await featuredCards(event.featured) } }
}

export default function EventPage({ slug, cards }) {
  const event = EVENTS.find(e => e.slug === slug)
  const path = `${HUB.path}/${slug}`
  return (
    <>
      <Seo
        title={event.title}
        description={event.description}
        path={path}
        image={event.image}
        imageAlt={event.imageAlt}
        preloadImage={event.image}
        breadcrumb={[HUB, { name: event.name, path }]}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: event.title,
            serviceType: 'Location de matériel événementiel',
            description: event.description,
            url: `${SITE.url}${path}`,
            provider: PROVIDER_LD,
            areaServed: { '@type': 'AdministrativeArea', name: SITE.region },
          },
          faqLd(event.faq),
        ]}
      />
      <LandingPage page={event} h1={event.h1} crumbs={[HUB, { name: event.name, path }]} cards={cards} cardsTitle={`Notre sélection : ${event.label}`}>
        <nav aria-label="Autres événements" className="seo-related-links">
          <h2>Autres événements</h2>
          <ul>{EVENTS.filter(e => e.slug !== slug).map(e => <li key={e.slug}><Link href={`${HUB.path}/${e.slug}`}>{e.name}</Link></li>)}</ul>
        </nav>
      </LandingPage>
    </>
  )
}

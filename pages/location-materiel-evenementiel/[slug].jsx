import Link from 'next/link'
import Seo, { PROVIDER_LD, clampDescription, faqLd } from '../../src/components/Seo.jsx'
import LandingPage from '../../src/components/seo/LandingPage.jsx'
import { SITE } from '../../src/lib/site.js'
import { ZONES } from '../../src/lib/seo/landings.js'

const HUB = { name: 'Zones de livraison', path: '/location-materiel-evenementiel' }

export async function getServerSideProps({ params }) {
  const zone = ZONES.find(z => z.slug === params.slug)
  if (!zone) return { notFound: true }
  const { featuredCards } = await import('../../src/lib/seo/featured-cards.js')
  return { props: { slug: zone.slug, cards: await featuredCards(zone.featured) } }
}

export default function Zone({ slug, cards }) {
  const zone = ZONES.find(z => z.slug === slug)
  const path = `${HUB.path}/${slug}`
  const name = `${zone.name} (${zone.code})`
  const others = ZONES.filter(z => z.slug !== slug)
  return (
    <>
      <Seo
        title={`Location de matériel événementiel ${zone.prep} (${zone.code})`}
        description={clampDescription(zone.lead)}
        path={path}
        image={zone.image}
        imageAlt={zone.imageAlt}
        preloadImage={zone.image}
        breadcrumb={[HUB, { name, path }]}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: `Location de matériel événementiel ${zone.prep}`,
            serviceType: 'Location de matériel événementiel',
            description: zone.lead,
            url: `${SITE.url}${path}`,
            provider: PROVIDER_LD,
            areaServed: { '@type': 'AdministrativeArea', name: zone.name },
          },
          faqLd(zone.faq),
        ]}
      />
      <LandingPage page={zone} h1={`Location de matériel événementiel ${zone.prep}`} crumbs={[HUB, { name, path }]} cards={cards} cardsTitle={`Le matériel à louer ${zone.prep}`} faqTitle={`Location ${zone.prep} : vos questions`}>
        <section>
          <h2>Secteurs desservis {zone.prep}</h2>
          <p>Nous livrons notamment à : {zone.communes.join(', ')}, ainsi que dans le reste du département.</p>
        </section>
        <nav aria-label="Autres départements" className="seo-related-links">
          <h2>Autres départements</h2>
          <ul>{others.map(z => <li key={z.slug}><Link href={`${HUB.path}/${z.slug}`}>{z.name} ({z.code})</Link></li>)}</ul>
        </nav>
      </LandingPage>
    </>
  )
}

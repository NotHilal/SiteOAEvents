import Link from 'next/link'
import Seo, { clampDescription, faqLd } from '../../src/components/Seo.jsx'
import CatalogueListing from '../../src/components/product/CatalogueListing.jsx'
import Faq from '../../src/components/seo/Faq.jsx'
import RichText from '../../src/components/seo/RichText.jsx'
import { SITE } from '../../src/lib/site.js'
import { CATEGORY_SEO } from '../../src/lib/seo/catalogue.js'
import { EVENTS } from '../../src/lib/seo/landings.js'

// A catalogue category at its own URL (/location/chaises): its articles, then
// its SEO copy. The slug derives from the category's name, so a category
// created in the admin gets a page straight away, with generic copy until it
// has an entry in src/lib/seo/catalogue.js. ?tri= stays on the canonical URL.
export async function getServerSideProps({ params, query }) {
  const { getCatalogueListing } = await import('../../src/lib/catalogue-listing.js')
  const listing = await getCatalogueListing({ categorySlug: String(params.slug || ''), tri: query.tri })
  if (!listing) return { notFound: true }
  return { props: { ...listing, slug: params.slug } }
}

export default function CategoryPage({ slug, ...listing }) {
  const seo = CATEGORY_SEO[slug]
  const label = listing.title.toLocaleLowerCase('fr')
  const path = `/location/${slug}`
  const url = `${SITE.url}${path}`
  const h1 = seo?.h1 || `Location : ${label}`
  return (
    <>
      <Seo
        title={seo?.title || `Location : ${label} en ${SITE.region}`}
        description={clampDescription(seo?.description || listing.intro || `Louez ${label} pour vos réceptions en ${SITE.region} : prix affichés en ligne, livraison et installation.`)}
        path={path}
        noindex={!listing.cards.length}
        breadcrumb={[{ name: 'Catalogue', path: '/catalogue' }, { name: listing.title, path }]}
        image={listing.cards.find(c => c.imageUrl)?.imageUrl}
        jsonLd={[
          listing.cards.length ? {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: h1,
            url,
            inLanguage: 'fr-FR',
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: listing.cards.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE.url}/catalogue/${c.slug}`, name: c.name })),
            },
          } : null,
          faqLd(seo?.faq),
        ]}
      />
      <CatalogueListing {...listing} h1={h1} intro={listing.intro || seo?.lead || ''}>
        {seo && (
          <div className="seo-page-body seo-category-text">
            {seo.sections.map(s => (
              <section key={s.h}>
                <h2>{s.h}</h2>
                <p><RichText text={s.p} /></p>
              </section>
            ))}
            <section>
              <h2>Livraison dans toute l’Île-de-France</h2>
              <p>
                Nous livrons à <Link href="/location-materiel-evenementiel/paris">Paris</Link>, dans les <Link href="/location-materiel-evenementiel/yvelines">Yvelines</Link> et dans <Link href="/location-materiel-evenementiel">tous les départements franciliens</Link>.
                {' '}Une idée précise de votre événement ? Voir notre sélection pour {EVENTS.map((e, i) => (
                  <span key={e.slug}>{i > 0 && (i === EVENTS.length - 1 ? ' et ' : ', ')}<Link href={`/evenements/${e.slug}`}>{e.label}</Link></span>
                ))}.
              </p>
            </section>
            <Faq items={seo.faq} title={`Location : ${label}, vos questions`} />
          </div>
        )}
      </CatalogueListing>
    </>
  )
}

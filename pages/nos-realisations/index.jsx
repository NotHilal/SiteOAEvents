import PageBanner from '../../src/components/PageBanner.jsx'
import Seo from '../../src/components/Seo.jsx'
import { SITE_URL } from '../../src/lib/site.js'
import RealisationsGrid from '../../src/components/RealisationsGrid.jsx'
import { getRealisations } from '../../src/lib/realisations-server.js'

import { cms, useCmsContent } from '../../src/lib/cms/client.js'

export async function getServerSideProps() {
  const { getPageProps } = await import('../../src/lib/cms/server.js')
  const [items, cmsProps] = await Promise.all([getRealisations(), getPageProps('realisations')])
  return { props: { items, ...cmsProps } }
}

// Texts and banner: Espace OA > Contenu des pages > Nos réalisations.
export default function Realisations({ items, cms: initialContent }) {
  const c = useCmsContent('realisations', initialContent)
  return <>
    <Seo title={c.seo.title} description={c.seo.description} path="/nos-realisations" noindex={!items.length} preloadImage={c.header.image} breadcrumb={[{ name: 'Nos réalisations', path: '/nos-realisations' }]} jsonLd={items.length ? {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/nos-realisations/${item.slug}`, name: item.title })),
    } : undefined} />
    <div className="site-wrap">
      <PageBanner title={c.header.title} image={c.header.image} editable={cms('realisations', 'header.title')} />
      <section className="oa-section"><div className="oa-container">
        {c.header.intro && <p className="realisations-intro" {...cms('realisations', 'header.intro')}>{c.header.intro}</p>}
        <RealisationsGrid items={items} />
      </div></section>
    </div>
  </>
}

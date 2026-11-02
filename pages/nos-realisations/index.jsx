import Link from 'next/link'
import Seo from '../../src/components/Seo.jsx'
import { SITE_URL } from '../../src/lib/site.js'
import RealisationsGrid from '../../src/components/RealisationsGrid.jsx'
import { getRealisations } from '../../src/lib/realisations-server.js'

const PAGE_HEADER_DEFAULT = 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1600&q=75&auto=format&fit=crop'

export async function getServerSideProps() {
  return { props: { items: await getRealisations() } }
}

export default function Realisations({ items }) {
  return <>
    <Seo title="Nos réalisations" description="Découvrez les événements réalisés par OA Événementiel : récits, photos et vidéos." path="/nos-realisations" noindex={!items.length} preloadImage={PAGE_HEADER_DEFAULT} breadcrumb={[{ name: 'Nos réalisations', path: '/nos-realisations' }]} jsonLd={items.length ? {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/nos-realisations/${item.slug}`, name: item.title })),
    } : undefined} />
    <div className="site-wrap">
      <div className="page-header" style={{ backgroundImage: `url(${PAGE_HEADER_DEFAULT})` }}>
        <div className="page-header-overlay" />
        <div className="container">
          <h1>Nos réalisations</h1>
          <nav aria-label="Fil d’Ariane"><ol className="breadcrumb justify-content-center"><li className="breadcrumb-item"><Link href="/">Accueil</Link></li><li className="breadcrumb-item active" aria-current="page">Nos réalisations</li></ol></nav>
        </div>
      </div>
      <section className="oa-section"><div className="oa-container">
        <p className="realisations-intro">Chaque événement a son histoire. Découvrez les nôtres en images.</p>
        <RealisationsGrid items={items} />
      </div></section>
    </div>
  </>
}

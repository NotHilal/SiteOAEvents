import Link from 'next/link'
import Seo from '../../src/components/Seo.jsx'
import RealisationsGrid from '../../src/components/RealisationsGrid.jsx'
import { getRealisations } from '../../src/lib/realisations-server.js'

export async function getServerSideProps() {
  return { props: { items: await getRealisations() } }
}

export default function Realisations({ items }) {
  return <>
    <Seo title="Nos réalisations" description="Découvrez les événements réalisés par OA Événementiel : récits, photos et vidéos." path="/nos-realisations" breadcrumb={[{ name: 'Nos réalisations', path: '/nos-realisations' }]} />
    <div className="site-wrap"><section className="oa-section"><div className="oa-container">
      <nav aria-label="Fil d’Ariane"><ol className="breadcrumb"><li className="breadcrumb-item"><Link href="/">Accueil</Link></li><li className="breadcrumb-item active" aria-current="page">Nos réalisations</li></ol></nav>
      <div className="realisations-heading"><h1>Nos réalisations</h1><p>Chaque événement a son histoire. Découvrez les nôtres en images.</p></div>
      <RealisationsGrid items={items} />
    </div></section></div>
  </>
}

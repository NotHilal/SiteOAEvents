import Seo from '../../src/components/Seo.jsx'
import CatalogueListing from '../../src/components/product/CatalogueListing.jsx'
import { catalogueCategoryHref } from '../../src/components/product/productUtils.js'

const PATH = '/catalogue/complet'

// Every rentable article on one page. The old ?categorie=CHAISES filter URLs
// redirect permanently to the category's own page (/location/chaises).
export async function getServerSideProps({ query }) {
  if (typeof query.categorie === 'string' && query.categorie) {
    const tri = typeof query.tri === 'string' && query.tri ? `?tri=${encodeURIComponent(query.tri)}` : ''
    return { redirect: { destination: `${catalogueCategoryHref(query.categorie)}${tri}`, permanent: true } }
  }
  const { getCatalogueListing } = await import('../../src/lib/catalogue-listing.js')
  return { props: await getCatalogueListing({ tri: query.tri }) }
}

export default function CatalogueComplet(props) {
  return (
    <>
      <Seo
        title="Tout le matériel à louer : tentes, tables, chaises, vaisselle"
        description="Tous nos articles à louer dans toute la France, avec leurs prix : tentes de réception, tables, chaises, banquettes, vaisselle, décoration et accessoires."
        path={PATH}
        breadcrumb={[{ name: 'Catalogue', path: '/catalogue' }, { name: props.title, path: PATH }]}
      />
      <CatalogueListing {...props} />
    </>
  )
}

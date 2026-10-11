import Seo from '../../src/components/Seo.jsx'
import ProductSingle from '../../src/components/product/ProductSingle.jsx'
import ProductMultiple from '../../src/components/product/ProductMultiple.jsx'
import { getCatalogueProduct } from '../../src/lib/catalogue-products.js'
import { SITE } from '../../src/lib/site.js'

// One route for every catalogue product (/catalogue/table-ronde,
// /catalogue/kit-lumiere-led…). Rendered per request so a direct link or a
// refresh always shows current prices and stock, and unknown slugs get a
// real 404. The template follows the data: one variant → Single Option,
// several → Multiple Options (see src/lib/catalogue-products.js).
export async function getServerSideProps({ params }) {
  const data = await getCatalogueProduct(String(params.slug || ''))
  if (!data) return { notFound: true }
  return { props: data }
}

export default function CatalogueProduct({ product, variants, activeVariantId, related }) {
  const lead = variants.find(v => v.id === activeVariantId) || variants[0]
  const image = variants.find(v => v.imageUrl)?.imageUrl
  const description = (product.description || lead.description || '').trim()

  return (
    <>
      <Seo
        title={`Location ${product.name}`}
        description={description
          ? `${product.name} à la location : ${description}`.slice(0, 160)
          : `Louez ${product.name} pour votre réception en ${SITE.region} avec OA Événementiel.`}
        path={`/catalogue/${product.slug}`}
        image={image ? (/^https?:/.test(image) ? image : `${SITE.url}${image}`) : undefined}
        breadcrumb={[{ name: 'Catalogue', path: '/catalogue' }, { name: product.name, path: `/catalogue/${product.slug}` }]}
      />
      {variants.length > 1
        ? <ProductMultiple product={product} variants={variants} activeVariantId={activeVariantId} related={related} />
        : <ProductSingle product={product} variant={variants[0]} related={related} />}
    </>
  )
}

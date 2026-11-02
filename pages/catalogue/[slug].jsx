import Seo, { ORGANIZATION_ID, absoluteUrl, clampDescription } from '../../src/components/Seo.jsx'
import ProductSingle from '../../src/components/product/ProductSingle.jsx'
import ProductMultiple from '../../src/components/product/ProductMultiple.jsx'
import { getCatalogueProduct } from '../../src/lib/catalogue-products.js'
import { SITE } from '../../src/lib/site.js'
import { ttcFromHt } from '../../src/lib/pricing.js'
import { catalogueCategoryHref, categoryLabel } from '../../src/components/product/productUtils.js'
import { PRODUCT_SEO } from '../../src/lib/seo/catalogue.js'

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

// schema.org Product: name, photos and the range of TTC unit rates (every
// tier, weekday and weekend) so search results can show "à partir de".
function productLd(product, variants, description, url) {
  const images = [...new Set(variants.flatMap(v => v.images || []))].slice(0, 10).map(absoluteUrl)
  const prices = variants.flatMap(v => v.tiers.flatMap(t => [ttcFromHt(t.price_weekday_ht), ttcFromHt(t.price_weekend_ht)])).filter(p => p > 0)
  const available = variants.some(v => v.available)
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url,
    ...(description ? { description } : {}),
    ...(images.length ? { image: images } : {}),
    ...(product.category ? { category: categoryLabel(product.category) } : {}),
    brand: { '@type': 'Brand', name: SITE.name },
    ...(prices.length ? {
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'EUR',
        lowPrice: Math.min(...prices).toFixed(2),
        highPrice: Math.max(...prices).toFixed(2),
        offerCount: variants.length,
        availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        businessFunction: 'http://purl.org/goodrelations/v1#LeaseOut',
        areaServed: { '@type': 'AdministrativeArea', name: SITE.region },
        seller: { '@type': 'Organization', '@id': ORGANIZATION_ID, name: SITE.name },
      },
    } : {}),
  }
}

export default function CatalogueProduct({ product, variants, activeVariantId, related }) {
  const lead = variants.find(v => v.id === activeVariantId) || variants[0]
  const image = variants.find(v => v.imageUrl)?.imageUrl
  const editorial = PRODUCT_SEO[product.slug]
  const description = (product.description || editorial?.lead || lead.description || '').trim()

  return (
    <>
      <Seo
        title={`Location ${product.name} en ${SITE.region}`}
        description={clampDescription(editorial?.lead || (description
          ? `${product.name} à la location : ${description}`
          : `Louez ${product.name} pour votre réception en ${SITE.region} avec OA Événementiel.`))}
        path={`/catalogue/${product.slug}`}
        image={image}
        imageAlt={`Location ${product.name}`}
        type="product"
        jsonLd={productLd(product, variants, description, `${SITE.url}/catalogue/${product.slug}`)}
        breadcrumb={[
          { name: 'Catalogue', path: '/catalogue' },
          ...(product.category ? [{ name: categoryLabel(product.category), path: catalogueCategoryHref(product.category) }] : []),
          { name: product.name, path: `/catalogue/${product.slug}` },
        ]}
      />
      {variants.length > 1
        ? <ProductMultiple product={product} variants={variants} activeVariantId={activeVariantId} related={related} />
        : <ProductSingle product={product} variant={variants[0]} related={related} />}
    </>
  )
}

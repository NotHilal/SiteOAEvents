import Link from 'next/link'
import Icon from '../Icon.jsx'
import { catalogueCategoryHref, categoryLabel } from './productUtils.js'
import RichText from '../seo/RichText.jsx'
import { PRODUCT_SEO } from '../../lib/seo/catalogue.js'
import ProductGallery from './ProductGallery.jsx'

// Frame shared by both product templates (options.fr product page, see
// /example/product-single and /example/product-multiple): "Retour" +
// breadcrumb, square picture on the left, product column on the right,
// then other products from the same category.
export default function ProductLayout({ product, images, imageAlt, imageCaption, related, children }) {
  const editorial = PRODUCT_SEO[product.slug]
  return (
    <div className="site-wrap pdp">
      <nav className="pdp-breadcrumbs" aria-label="Fil d'Ariane">
        <Link href="/catalogue/complet" className="pdp-back">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Retour
        </Link>
        <ol>
          <li><Link href="/">Accueil</Link></li>
          <li><Link href="/catalogue/complet">Catalogue complet</Link></li>
          {product.category && <li><Link href={catalogueCategoryHref(product.category)}>{categoryLabel(product.category)}</Link></li>}
          <li aria-current="page"><strong>{product.name}</strong></li>
        </ol>
      </nav>

      <div className="pdp-main">
        <div className="pdp-media">
          <ProductGallery images={images || []} alt={imageAlt} />
          {images?.length > 0 && imageCaption && <p className="pdp-media-caption">{imageCaption}</p>}
        </div>
        <div className="pdp-info">{children}</div>
      </div>

      {editorial && (
        <section className="seo-product-text" aria-labelledby="pdp-about-title">
          <h2 id="pdp-about-title">{product.name} à louer en Île-de-France</h2>
          <p>{editorial.lead}</p>
          <p><RichText text={editorial.body} /></p>
          <p className="seo-product-delivery">Livraison dans toute l’Île-de-France, avec un total calculé avant le paiement. <Link href="/faq">Questions fréquentes</Link> · <Link href="/location-materiel-evenementiel">Zones de livraison</Link></p>
        </section>
      )}

      {related.length > 0 && (
        <section className="oa-section-tight pdp-related" aria-labelledby="pdp-related-title">
          <div className="oa-container">
            <h2 id="pdp-related-title" className="oa-section-title">Dans la même catégorie</h2>
            <div className="shop-related-grid">
              {related.map(r => (
                <Link href={`/catalogue/${r.slug}`} className="shop-related" key={r.key}>
                  <span className="shop-related-media">
                    {r.imageUrl
                      ? <img src={r.imageUrl} alt={`Location ${r.name}`} loading="lazy" decoding="async" />
                      : <Icon name="image" size={40} strokeWidth={1} />}
                  </span>
                  <span className="shop-related-name">{r.name}</span>
                  <span className="shop-related-link">Voir le produit <i className="fas fa-arrow-right" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

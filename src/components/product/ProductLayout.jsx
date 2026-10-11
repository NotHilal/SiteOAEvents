import Link from 'next/link'
import Icon from '../Icon.jsx'
import { catalogueCategoryHref } from './productUtils.js'

// Frame shared by both product templates (options.fr product page, see
// /example/product-single and /example/product-multiple): "Retour" +
// breadcrumb, square picture on the left, product column on the right,
// then other products from the same category.
export default function ProductLayout({ product, image, imageAlt, imageCaption, related, children }) {
  return (
    <div className="site-wrap pdp">
      <nav className="pdp-breadcrumbs" aria-label="Fil d'Ariane">
        <Link href="/catalogue" className="pdp-back">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Retour
        </Link>
        <ol>
          <li><Link href="/">Accueil</Link></li>
          <li><Link href="/catalogue">Catalogue</Link></li>
          {product.category && <li><Link href={catalogueCategoryHref(product.category)}>{product.category}</Link></li>}
          <li aria-current="page"><strong>{product.name}</strong></li>
        </ol>
      </nav>

      <div className="pdp-main">
        <div className="pdp-media">
          {image
            // key: a new picture (variant change) fades in instead of
            // swapping abruptly.
            ? <img key={image} src={image} alt={imageAlt} className="pdp-media-img" />
            : (
              <div className="pdp-media-empty">
                <Icon name="image" size={56} strokeWidth={0.9} />
                <span>Photo bientôt disponible</span>
              </div>
            )}
          {image && imageCaption && <p className="pdp-media-caption">{imageCaption}</p>}
        </div>
        <div className="pdp-info">{children}</div>
      </div>

      {related.length > 0 && (
        <section className="oa-section-tight pdp-related" aria-labelledby="pdp-related-title">
          <div className="oa-container">
            <h2 id="pdp-related-title" className="oa-section-title">Dans la même catégorie</h2>
            {/* Same cards as the homepage catalogue teaser. */}
            <div className="oa-catalogue-teaser-grid">
              {related.map(r => (
                <article className="oa-product-card" key={r.key}>
                  <Link href={`/catalogue/${r.slug}`} className="oa-product-link">
                    <div className="oa-product-media">
                      {r.imageUrl
                        ? <img src={r.imageUrl} alt="" loading="lazy" />
                        : <Icon name="image" size={40} strokeWidth={1} className="oa-product-placeholder" />}
                    </div>
                    <div className="oa-product-details">
                      <h3 className="oa-product-name">{r.name}</h3>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

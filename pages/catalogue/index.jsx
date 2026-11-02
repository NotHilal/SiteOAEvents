import Link from 'next/link'
import Seo from '../../src/components/Seo.jsx'
import { catalogueCategoryHref } from '../../src/components/product/productUtils.js'
import { categoryTitle, sortCategories } from '../../src/lib/catalogue-pages.js'

const PAGE_HEADER_DEFAULT = 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=1600&q=75&auto=format&fit=crop'

// Catalogue landing: one tile per category (Espace OA > Catalogue), laid out
// like options.fr's category landing (3-column masonry, portrait and square
// tiles alternating). Each tile opens the full catalogue on that filter.
// Every tile on one page, scrolled through (the old /catalogue-2, -3… pages
// redirect here, see next.config.js).
export async function getServerSideProps() {
  const { default: db } = await import('../../src/lib/db/index.js')
  const rows = sortCategories(await db.prepare('SELECT id, name, label, description, image_url, position, created_at FROM categories').all())
  const tiles = rows.map(c => ({
    key: String(c.id),
    value: c.name,
    label: categoryTitle(c),
    img: c.image_url || null,
    text: c.description || '',
  }))
  const { count: productCount } = await db.prepare("SELECT COUNT(DISTINCT COALESCE(product_id, 'm:' || id)) AS count FROM materials WHERE available = true").get()
  return { props: { tiles, productCount: Number(productCount) || 0 } }
}

// Desktop places tiles row by row into 3 columns (1·4, 2·5, 3·6), like the
// reference masonry: tiles 1, 3 and 5 are portrait (3:4), the others square.
// Below 992px the columns dissolve (display: contents) and `order` restores
// the reading order.
function toColumns(tiles) {
  return [0, 1, 2].map(c => tiles.map((tile, i) => ({ ...tile, i, tall: i % 2 === 0 })).filter(tile => tile.i % 3 === c))
}

export default function Catalogue({ tiles, productCount }) {
  return (
    <>
      <Seo
        title="Catalogue de location de matériel événementiel"
        description="Tentes, tables, chaises, banquettes, vaisselle, décoration et accessoires : découvrez par catégorie tout le matériel à louer pour vos réceptions en Île-de-France."
        path="/catalogue"
        breadcrumb={[{ name: 'Catalogue', path: '/catalogue' }]}
        preloadImage={PAGE_HEADER_DEFAULT}
      />

      <div className="site-wrap">
        <div className="page-header" style={{ backgroundImage: `url(${PAGE_HEADER_DEFAULT})` }}>
          <div className="page-header-overlay" />
          <div className="container">
            <h1>Notre Catalogue</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb justify-content-center">
                <li className="breadcrumb-item"><Link href="/">Accueil</Link></li>
                <li className="breadcrumb-item active">Catalogue</li>
              </ol>
            </nav>
          </div>
        </div>

        <section className="oa-section oa-cat-landing">
          <div className="oa-container">
            <p className="oa-cat-landing-intro" data-reveal>
              OA Événementiel vous propose à la location le mobilier, la décoration et les accessoires de vos réceptions.
              Choisissez une catégorie, ou parcourez tous nos articles d’un coup.
            </p>

            <Link href="/catalogue/complet" className="shop-allcat" data-reveal>
              <span className="shop-allcat-text">
                <span className="shop-allcat-eyebrow">{productCount} articles à louer</span>
                <span className="shop-allcat-title">Voir tout le catalogue</span>
              </span>
              <span className="shop-allcat-arrow" aria-hidden="true"><i className="fas fa-arrow-right" /></span>
            </Link>

            {tiles.length > 0 ? (
              <div className="oa-cat-masonry" data-reveal>
                {toColumns(tiles).map((col, c) => (
                  <div className="oa-cat-col" key={c}>
                    {col.map(tile => (
                      <Link
                        key={tile.key}
                        href={catalogueCategoryHref(tile.value)}
                        className={`oa-cat-tile${tile.tall ? ' oa-cat-tile-tall' : ''}${tile.img ? '' : ' oa-cat-tile-empty'}`}
                        style={{ order: tile.i }}
                      >
                        {tile.img && <img src={tile.img} alt={`Location : ${tile.label}`} loading={tile.i < 3 ? 'eager' : 'lazy'} decoding="async" />}
                        <h2 className="oa-cat-title">{tile.label}</h2>
                        <span className="oa-cat-detail">
                          {tile.text && <span className="oa-cat-text">{tile.text}</span>}
                          <span className="oa-cat-btn">Découvrir</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-mat-msg"><i className="fas fa-info-circle me-2" />Aucune catégorie pour le moment.</p>
            )}


            <div className="oa-center-cta" data-reveal>
              <Link href="/catalogue/complet" className="shop-btn shop-btn-dark shop-btn-xl">
                Voir tout le catalogue <i className="fas fa-arrow-right" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

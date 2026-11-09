import Link from 'next/link'
import Seo from '../../src/components/Seo.jsx'
import { catalogueCategoryHref } from '../../src/components/product/productUtils.js'

const PAGE_HEADER_DEFAULT = 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=1600&q=75&auto=format&fit=crop'

// Catalogue landing: one tile per category (Espace OA > Catalogue), then a
// closing tile for the whole catalogue. Each tile opens that category. Every
// tile on one page, scrolled through (the old /catalogue-2, -3… pages redirect
// here, see next.config.js).
export async function getServerSideProps() {
  const { default: db } = await import('../../src/lib/db/index.js')
  const { getCatalogueCategories } = await import('../../src/lib/catalogue-categories.js')
  const rows = await getCatalogueCategories()
  const tiles = rows.map(c => ({
    key: String(c.id),
    value: c.name,
    label: c.label,
    img: c.image_url || null,
    text: c.description || '',
  }))
  const { count: productCount } = await db.prepare("SELECT COUNT(DISTINCT COALESCE(product_id, 'm:' || id)) AS count FROM materials WHERE available = true").get()
  return { props: { tiles, productCount: Number(productCount) || 0 } }
}

// Lookbook rhythm on a 12-column grid: rows of two (7 + 5, then 5 + 7) and
// three (4 + 4 + 4) alternate. A last row short of items takes the width left,
// so any number of categories fills the grid without a hole.
function rowSpans(count) {
  const spans = []
  let pairs = 0
  let three = false
  while (spans.length < count) {
    const size = Math.min(three ? 3 : 2, count - spans.length)
    if (size === 3) spans.push(4, 4, 4)
    else if (size === 2) spans.push(...(pairs++ % 2 ? [5, 7] : [7, 5]))
    else spans.push(12)
    three = !three
  }
  return spans
}

export default function Catalogue({ tiles, productCount }) {
  const spans = rowSpans(tiles.length + 1)
  return (
    <>
      <Seo
        title="Catalogue de location de matériel événementiel"
        description="Tentes, tables, chaises, banquettes, vaisselle, décoration et accessoires : découvrez par catégorie tout le matériel à louer pour vos réceptions partout en France."
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
            <div className="oa-cat-head" data-reveal>
              <p className="oa-cat-landing-intro">
                OA Événementiel vous propose à la location le mobilier, la décoration et les accessoires de vos réceptions.
                Choisissez une catégorie, ou parcourez tous nos articles d’un coup.
              </p>
              <Link href="/catalogue/complet" className="oa-cat-head-link">
                Voir tout le catalogue <i className="fas fa-arrow-right" aria-hidden="true" />
              </Link>
            </div>

            {tiles.length > 0 ? (
              <div className="oa-cat-grid" data-reveal>
                {tiles.map((tile, i) => (
                  <Link
                    key={tile.key}
                    href={catalogueCategoryHref(tile.value)}
                    className="oa-cat-tile"
                    style={{ '--span': spans[i] }}
                  >
                    {tile.img && <img src={tile.img} alt={`Location : ${tile.label}`} loading={i < 3 ? 'eager' : 'lazy'} decoding="async" />}
                    <span className="oa-cat-tile-arrow" aria-hidden="true"><i className="fas fa-arrow-right" /></span>
                    <div className="oa-cat-tile-body">
                      <h2 className="oa-cat-title">{tile.label}</h2>
                      {tile.text && (
                        <div className="oa-cat-more"><div><span className="oa-cat-text">{tile.text}</span></div></div>
                      )}
                    </div>
                  </Link>
                ))}
                <Link href="/catalogue/complet" className="oa-cat-all" style={{ '--span': spans[tiles.length] }}>
                  <strong>Voir tout le catalogue</strong>
                  <span>{productCount} articles à louer <i className="fas fa-arrow-right" aria-hidden="true" /></span>
                </Link>
              </div>
            ) : (
              <p className="no-mat-msg"><i className="fas fa-info-circle me-2" />Aucune catégorie pour le moment.</p>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

import Link from 'next/link'
import Seo from '../../src/components/Seo.jsx'
import { catalogueCategoryHref } from '../../src/components/product/productUtils.js'
import { TILES_PER_PAGE, cataloguePageCount, cataloguePagePath, categoryTitle, sortCategories } from '../../src/lib/catalogue-pages.js'

const PAGE_HEADER_DEFAULT = 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=1600&q=75&auto=format&fit=crop'

// Catalogue landing: one tile per category (Espace OA > Catalogue), laid out
// like options.fr's category landing (3-column masonry, portrait and square
// tiles alternating). Each tile opens the full catalogue on that filter.
// 6 tiles a page: /catalogue, then /catalogue-2, /catalogue-3… (rewritten to
// ?page=N in next.config.js), with arrows between pages.
export async function getServerSideProps({ query }) {
  const page = Number.parseInt(String(query.page || '1'), 10)
  if (!Number.isInteger(page) || page < 1) return { notFound: true }
  if (page === 1 && query.page) return { redirect: { destination: '/catalogue', permanent: false } }
  const { default: db } = await import('../../src/lib/sqlite-db.js')
  const rows = sortCategories(await db.prepare('SELECT id, name, label, description, image_url, position, created_at FROM categories').all())
  const pageCount = cataloguePageCount(rows.length)
  if (page > pageCount) return { notFound: true }
  const tiles = rows.slice((page - 1) * TILES_PER_PAGE, page * TILES_PER_PAGE).map(c => ({
    key: String(c.id),
    value: c.name,
    label: categoryTitle(c),
    img: c.image_url || null,
    text: c.description || '',
  }))
  return { props: { tiles, page, pageCount } }
}

// Desktop places tiles row by row into 3 columns (1·4, 2·5, 3·6), like the
// reference masonry: tiles 1, 3 and 5 are portrait (3:4), the others square.
// Below 992px the columns dissolve (display: contents) and `order` restores
// the reading order.
function toColumns(tiles) {
  return [0, 1, 2].map(c => tiles.map((tile, i) => ({ ...tile, i, tall: i % 2 === 0 })).filter(tile => tile.i % 3 === c))
}

export default function Catalogue({ tiles, page, pageCount }) {
  const path = cataloguePagePath(page)
  return (
    <>
      <Seo
        title="Catalogue : location de mobilier et de décoration"
        description="Banquettes, chaises, tables, tentes, décoration et accessoires : découvrez par catégorie le mobilier et la décoration à louer pour vos réceptions."
        path={path}
        breadcrumb={page > 1 ? [{ name: 'Catalogue', path: '/catalogue' }, { name: `Page ${page}`, path }] : [{ name: 'Catalogue', path: '/catalogue' }]}
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
                {page > 1 ? <>
                  <li className="breadcrumb-item"><Link href="/catalogue">Catalogue</Link></li>
                  <li className="breadcrumb-item active">Page {page}</li>
                </> : <li className="breadcrumb-item active">Catalogue</li>}
              </ol>
            </nav>
          </div>
        </div>

        <section className="oa-section oa-cat-landing">
          <div className="oa-container">
            <p className="oa-cat-landing-intro" data-reveal>
              OA Événementiel vous propose à la location le mobilier, la décoration et les accessoires de vos réceptions.
              Choisissez une catégorie pour découvrir nos articles, ou parcourez <Link href="/catalogue/complet">tout le catalogue</Link>.
            </p>

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
                        {tile.img && <img src={tile.img} alt="" loading={tile.i < 3 ? 'eager' : 'lazy'} decoding="async" />}
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

            {pageCount > 1 && (
              <nav className="oa-cat-pager" aria-label="Pages du catalogue">
                {page > 1
                  ? <Link href={cataloguePagePath(page - 1)} className="oa-cat-pager-arrow" aria-label="Page précédente"><i className="fas fa-chevron-left" /></Link>
                  : <span className="oa-cat-pager-arrow is-disabled" aria-hidden="true"><i className="fas fa-chevron-left" /></span>}
                <ol className="oa-cat-pager-pages">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
                    <li key={n}>
                      <Link href={cataloguePagePath(n)} className={`oa-cat-pager-page${n === page ? ' is-active' : ''}`} aria-current={n === page ? 'page' : undefined}>{n}</Link>
                    </li>
                  ))}
                </ol>
                {page < pageCount
                  ? <Link href={cataloguePagePath(page + 1)} className="oa-cat-pager-arrow" aria-label="Page suivante"><i className="fas fa-chevron-right" /></Link>
                  : <span className="oa-cat-pager-arrow is-disabled" aria-hidden="true"><i className="fas fa-chevron-right" /></span>}
              </nav>
            )}

            <div className="oa-center-cta" data-reveal>
              <Link href="/catalogue/complet" className="theme-button theme-button-outline w-inline-block">
                <div className="theme-button-content"><div className="theme-button-text">Voir tout le catalogue</div></div>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

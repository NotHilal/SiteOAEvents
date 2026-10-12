import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Seo from '../../src/components/Seo.jsx'
import { getUnitPriceTtc, getMinOrderQty } from '../../src/lib/pricing.js'
import { addToCatalogueCart } from '../../src/lib/cart.js'
import { track } from '../../src/lib/analytics.js'
import { slugify } from '../../src/lib/slug.js'
import { categoryTitle, sortCategories } from '../../src/lib/catalogue-pages.js'
import { formatEuro, useCatalogueCart } from '../../src/components/product/productUtils.js'

// Product listing modelled on options.fr's category page
// (/mobilier/location-de-chaises.html): centred gold title + breadcrumb,
// "Produits 1-32 sur 121" toolbar with pages and a per-page limiter, then a
// 4-column grid whose cards lift on hover (shadow, "Ajouter au panier"
// scaling in over the photo, a "voir la fiche" action unfolding above the
// name). No search or filter: the category comes from the tile clicked on
// /catalogue (?categorie=CHAISES); without it, every article is listed.

const LIMITS = [32, 64, 'all']
const DEFAULT_LIMIT = 32
const MAX_SWATCHES = 3

const queryString = params => {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') qs.set(k, String(v))
  const s = qs.toString()
  return s ? `/catalogue/complet?${s}` : '/catalogue/complet'
}

export async function getServerSideProps({ query }) {
  const { default: db } = await import('../../src/lib/sqlite-db.js')
  const [materials, products, categoryRows, tierRows] = await Promise.all([
    db.prepare('SELECT * FROM materials WHERE available = 1 ORDER BY variant_order, name').all(),
    db.prepare('SELECT id, slug, name, category FROM products').all(),
    db.prepare('SELECT id, name, label, description, position, created_at FROM categories').all(),
    db.prepare('SELECT material_id, min_qty, max_qty, price_weekday_ht, price_weekend_ht FROM material_price_tiers ORDER BY min_qty').all(),
  ])
  const categories = sortCategories(categoryRows)

  const requested = typeof query.categorie === 'string' ? query.categorie : ''
  const category = requested ? categories.find(c => c.name === requested) || null : null
  if (requested && !category && !materials.some(m => (m.category || 'Autre') === requested)) {
    return { redirect: { destination: '/catalogue/complet', permanent: false } }
  }

  const tiers = {}
  for (const t of tierRows) (tiers[String(t.material_id)] ||= []).push({
    min_qty: t.min_qty, max_qty: t.max_qty ?? null,
    price_weekday_ht: t.price_weekday_ht, price_weekend_ht: t.price_weekend_ht,
  })

  // One card per product: a simple article is its own card; the options of
  // an article à options are folded into one card under the product's name
  // (they're chosen on its page) and shown as round swatches.
  const productById = Object.fromEntries(products.map(p => [String(p.id), p]))
  const cards = []
  const byProduct = {}
  for (const m of materials) {
    const minQty = getMinOrderQty(tiers[String(m.id)])
    const variant = {
      id: String(m.id),
      name: m.name,
      label: m.variant_label || m.name,
      slug: m.slug || slugify(m.name),
      imageUrl: m.image_url || null,
      minQty,
      maxQty: m.max_quantity || null,
      price: getUnitPriceTtc(tiers[String(m.id)], 'weekday', minQty),
    }
    const product = m.product_id && productById[String(m.product_id)]
    if (!product) {
      cards.push({ key: `m:${m.id}`, name: m.name, category: m.category || 'Autre', slug: variant.slug, variants: [variant] })
      continue
    }
    if (!byProduct[product.id]) {
      byProduct[product.id] = { key: `p:${product.id}`, name: product.name, category: product.category || m.category || 'Autre', slug: product.slug, variants: [] }
      cards.push(byProduct[product.id])
    }
    byProduct[product.id].variants.push(variant)
  }

  const filtered = requested ? cards.filter(c => c.category === requested) : cards
  // Whole catalogue: grouped by category, in the tile order of /catalogue.
  if (!requested) {
    const rank = Object.fromEntries(categories.map((c, i) => [c.name, i]))
    filtered.sort((a, b) => (rank[a.category] ?? 1e9) - (rank[b.category] ?? 1e9))
  }

  const limit = query.limit === 'all' ? 'all' : (LIMITS.includes(Number(query.limit)) ? Number(query.limit) : DEFAULT_LIMIT)
  const perPage = limit === 'all' ? Math.max(1, filtered.length) : limit
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage))
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(String(query.p || '1'), 10) || 1))
  const start = (page - 1) * perPage

  return {
    props: {
      cards: filtered.slice(start, start + perPage).map(card => {
        const prices = card.variants.map(v => v.price).filter(p => p > 0)
        return {
          ...card,
          imageUrl: card.variants.find(v => v.imageUrl)?.imageUrl || null,
          fromPrice: prices.length ? Math.min(...prices) : 0,
        }
      }),
      total: filtered.length,
      first: filtered.length ? start + 1 : 0,
      last: Math.min(start + perPage, filtered.length),
      page,
      pageCount,
      limit,
      categoryKey: requested || null,
      title: category ? categoryTitle(category) : (requested ? categoryTitle({ name: requested }) : 'Tout le catalogue'),
      intro: category?.description || '',
    },
  }
}

function Toolbar({ total, first, last, page, pageCount, limit, hrefFor, onLimit, bottom }) {
  return (
    <div className={`oa-pl-toolbar${bottom ? ' oa-pl-toolbar-bottom' : ''}`}>
      <p className="oa-pl-amount">
        {total > 0 ? <>Produits <span>{first}</span>-<span>{last}</span> sur <span>{total}</span></> : 'Aucun produit'}
      </p>
      {pageCount > 1 && (
        <nav className="oa-pl-pages" aria-label="Pages">
          <ol>
            {page > 1 && (
              <li><Link href={hrefFor(page - 1)} className="oa-pl-page oa-pl-page-arrow" aria-label="Page précédente"><i className="fas fa-caret-left" /></Link></li>
            )}
            {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
              <li key={n}>
                {n === page
                  ? <strong className="oa-pl-page is-current" aria-current="page">{n}</strong>
                  : <Link href={hrefFor(n)} className="oa-pl-page">{n}</Link>}
              </li>
            ))}
            {page < pageCount && (
              <li><Link href={hrefFor(page + 1)} className="oa-pl-page oa-pl-page-arrow" aria-label="Page suivante"><i className="fas fa-caret-right" /></Link></li>
            )}
          </ol>
        </nav>
      )}
      {!bottom && (
        <label className="oa-pl-limiter">
          <span className="visually-hidden">Produits par page</span>
          <select value={String(limit)} onChange={e => onLimit(e.target.value)}>
            {LIMITS.map(l => <option key={l} value={String(l)}>Afficher {l === 'all' ? 'tous' : l} par page</option>)}
          </select>
        </label>
      )}
    </div>
  )
}

function ProductCard({ card, inCart, onAdd, eager }) {
  const [added, setAdded] = useState(false)
  const href = `/catalogue/${card.slug}`
  const multiple = card.variants.length > 1
  const swatches = card.variants.slice(0, MAX_SWATCHES)
  const extra = card.variants.length - swatches.length

  function add() {
    onAdd(card.variants[0])
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  return (
    <li className="oa-pl-cell">
      <div className="oa-pl-card">
        <div className="oa-pl-image">
          <Link href={href} className="oa-pl-photo" tabIndex={-1} aria-hidden="true">
            {card.imageUrl
              ? <img src={card.imageUrl} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />
              : <span className="oa-pl-photo-empty"><i className="fas fa-image" /></span>}
          </Link>
          {inCart > 0 && <span className="oa-pl-badge">{inCart} dans votre sélection</span>}
          <div className="oa-pl-primary">
            {multiple ? (
              <Link href={href} className="oa-pl-tocart">
                <span>Choisir une option</span>
              </Link>
            ) : (
              <button type="button" className={`oa-pl-tocart${added ? ' is-added' : ''}`} onClick={add}>
                <span>{added ? 'Ajouté' : 'Ajouter au panier'}</span>
              </button>
            )}
          </div>
        </div>
        <div className="oa-pl-details">
          <div className="oa-pl-actions">
            <Link href={href} className="oa-pl-view" aria-label={`Voir la fiche ${card.name}`} title="Voir la fiche">
              <i className="far fa-eye" />
            </Link>
          </div>
          {multiple && (
            <div className="oa-pl-swatches">
              {swatches.map(v => (
                <Link key={v.id} href={`/catalogue/${v.slug}`} className="oa-pl-swatch" aria-label={v.label}>
                  {v.imageUrl ? <span className="oa-pl-swatch-img" style={{ backgroundImage: `url('${v.imageUrl}')` }} /> : <span className="oa-pl-swatch-img" />}
                  <span className="oa-pl-swatch-tip">{v.label}</span>
                </Link>
              ))}
              {extra > 0 && (
                <Link href={href} className="oa-pl-swatch oa-pl-swatch-more" title={`+${extra} options supplémentaires`}>+{extra}</Link>
              )}
            </div>
          )}
          <h2 className="oa-pl-name"><Link href={href}>{card.name}</Link></h2>
          {card.fromPrice > 0 && (
            <p className="oa-pl-price">dès <strong>{formatEuro(card.fromPrice)}</strong> TTC</p>
          )}
        </div>
      </div>
    </li>
  )
}

export default function CatalogueListing({ cards, total, first, last, page, pageCount, limit, categoryKey, title, intro }) {
  const router = useRouter()
  const cart = useCatalogueCart()
  const base = { categorie: categoryKey, limit: limit === DEFAULT_LIMIT ? null : limit }
  const hrefFor = n => queryString({ ...base, p: n > 1 ? n : null })
  const path = queryString({ categorie: categoryKey })

  function onLimit(value) {
    router.push(queryString({ categorie: categoryKey, limit: value === String(DEFAULT_LIMIT) ? null : value }))
  }

  function onAdd(variant) {
    const before = cart[variant.id] || 0
    addToCatalogueCart(variant.id, before > 0 ? 1 : variant.minQty, variant.maxQty)
    if (!before) track('Ajout panier', { emplacement: 'catalogue' })
  }

  const inCartOf = card => card.variants.reduce((n, v) => n + (cart[v.id] || 0), 0)

  return (
    <>
      <Seo
        title={categoryKey ? `Location ${title.toLocaleLowerCase('fr')}` : 'Catalogue : location de mobilier et de décoration'}
        description={intro || 'Parcourez notre catalogue de mobilier et de décoration à louer pour vos réceptions : chaises, tables, art de la table, luminaires et plus encore.'}
        path={path}
        breadcrumb={[{ name: 'Catalogue', path: '/catalogue' }, { name: title, path }]}
      />

      <div className="site-wrap oa-pl">
        <div className="oa-pl-title">
          <h1>{title}</h1>
          <nav aria-label="Fil d'Ariane">
            <ol className="oa-pl-breadcrumbs">
              <li><Link href="/">Accueil</Link></li>
              <li><Link href="/catalogue">Catalogue</Link></li>
              <li><strong>{title}</strong></li>
            </ol>
          </nav>
        </div>

        <div className="oa-pl-container">
          <p className="oa-pl-intro">
            {intro || 'Chez OA Événementiel, spécialiste de la location de matériel pour réception, vous trouverez un large choix d’articles pour tous vos événements. Les prix affichés sont indicatifs : le tarif définitif dépend de la date choisie.'}
          </p>

          <Toolbar total={total} first={first} last={last} page={page} pageCount={pageCount} limit={limit} hrefFor={hrefFor} onLimit={onLimit} />

          {cards.length > 0 ? (
            <ol className="oa-pl-grid">
              {cards.map((card, i) => (
                <ProductCard key={card.key} card={card} inCart={inCartOf(card)} onAdd={onAdd} eager={i < 4} />
              ))}
            </ol>
          ) : (
            <p className="oa-pl-empty">Aucun article disponible dans cette catégorie pour le moment.</p>
          )}

          {cards.length > 0 && (
            <Toolbar total={total} first={first} last={last} page={page} pageCount={pageCount} limit={limit} hrefFor={hrefFor} onLimit={onLimit} bottom />
          )}
        </div>
      </div>
    </>
  )
}

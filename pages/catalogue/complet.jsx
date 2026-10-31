import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Seo from '../../src/components/Seo.jsx'
import ShopCard from '../../src/components/product/ShopCard.jsx'
import QuickView from '../../src/components/product/QuickView.jsx'
import { categoryTitle } from '../../src/lib/catalogue-pages.js'
import { useCatalogueCart } from '../../src/components/product/productUtils.js'

// Shop listing: every rentable article (or one category with
// ?categorie=CHAISES), category chips, sorting, pages, and a quick view on
// every card. Cards come from src/lib/catalogue-cards.js.

const LIMITS = [24, 48, 'all']
const DEFAULT_LIMIT = 24
const SORTS = [
  { key: '', label: 'Pertinence' },
  { key: 'prix', label: 'Prix croissant' },
  { key: 'prix-desc', label: 'Prix décroissant' },
  { key: 'nom', label: 'Nom (A → Z)' },
]

const queryString = params => {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') qs.set(k, String(v))
  const s = qs.toString()
  return s ? `/catalogue/complet?${s}` : '/catalogue/complet'
}

export async function getServerSideProps({ query }) {
  const { getCatalogueCards } = await import('../../src/lib/catalogue-cards.js')
  const { cards, categories } = await getCatalogueCards()

  const requested = typeof query.categorie === 'string' ? query.categorie : ''
  const category = requested ? categories.find(c => c.name === requested) || null : null
  if (requested && !category && !cards.some(c => c.category === requested)) {
    return { redirect: { destination: '/catalogue/complet', permanent: false } }
  }

  const counts = {}
  for (const c of cards) counts[c.category] = (counts[c.category] || 0) + 1
  const chips = categories.filter(c => counts[c.name]).map(c => ({ key: c.name, label: categoryTitle(c), count: counts[c.name] }))

  const sort = SORTS.some(s => s.key === query.tri) ? String(query.tri) : ''
  let filtered = requested ? cards.filter(c => c.category === requested) : [...cards]
  const price = c => c.fromPrice || Infinity
  if (sort === 'prix') filtered.sort((a, b) => price(a) - price(b))
  if (sort === 'prix-desc') filtered.sort((a, b) => (b.fromPrice || 0) - (a.fromPrice || 0))
  if (sort === 'nom') filtered.sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  const limit = query.limit === 'all' ? 'all' : (LIMITS.includes(Number(query.limit)) ? Number(query.limit) : DEFAULT_LIMIT)
  const perPage = limit === 'all' ? Math.max(1, filtered.length) : limit
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage))
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(String(query.p || '1'), 10) || 1))
  const start = (page - 1) * perPage

  return {
    props: {
      cards: filtered.slice(start, start + perPage),
      total: filtered.length,
      allTotal: cards.length,
      first: filtered.length ? start + 1 : 0,
      last: Math.min(start + perPage, filtered.length),
      page,
      pageCount,
      limit,
      sort,
      chips,
      categoryKey: requested || null,
      title: category ? categoryTitle(category) : (requested ? categoryTitle({ name: requested }) : 'Tout le catalogue'),
      intro: category?.description || '',
    },
  }
}

function Pages({ page, pageCount, hrefFor }) {
  if (pageCount < 2) return null
  return (
    <nav className="shop-pages" aria-label="Pages">
      <ol>
        {page > 1 && <li><Link href={hrefFor(page - 1)} className="shop-page" aria-label="Page précédente"><i className="fas fa-chevron-left" /></Link></li>}
        {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
          <li key={n}>
            {n === page
              ? <strong className="shop-page is-current" aria-current="page">{n}</strong>
              : <Link href={hrefFor(n)} className="shop-page">{n}</Link>}
          </li>
        ))}
        {page < pageCount && <li><Link href={hrefFor(page + 1)} className="shop-page" aria-label="Page suivante"><i className="fas fa-chevron-right" /></Link></li>}
      </ol>
    </nav>
  )
}

export default function CatalogueListing({ cards, total, allTotal, first, last, page, pageCount, limit, sort, chips, categoryKey, title, intro }) {
  const router = useRouter()
  const cart = useCatalogueCart()
  const [quick, setQuick] = useState(null)
  const base = { categorie: categoryKey, tri: sort || null, limit: limit === DEFAULT_LIMIT ? null : limit }
  const hrefFor = n => queryString({ ...base, p: n > 1 ? n : null })
  const path = queryString({ categorie: categoryKey })
  const go = patch => router.push(queryString({ ...base, ...patch }), undefined, { scroll: false })
  const inCartOf = card => card.variants.reduce((n, v) => n + (cart[v.id] || 0), 0)

  return (
    <>
      <Seo
        title={categoryKey ? `Location ${title.toLocaleLowerCase('fr')}` : 'Catalogue : location de mobilier et de décoration'}
        description={intro || 'Parcourez notre catalogue de mobilier et de décoration à louer pour vos réceptions : chaises, tables, art de la table, luminaires et plus encore.'}
        path={path}
        breadcrumb={[{ name: 'Catalogue', path: '/catalogue' }, { name: title, path }]}
      />

      <div className="site-wrap shop-listing">
        <header className="shop-listing-head">
          <nav aria-label="Fil d'Ariane">
            <ol className="shop-crumbs">
              <li><Link href="/">Accueil</Link></li>
              <li><Link href="/catalogue">Catalogue</Link></li>
              <li aria-current="page">{title}</li>
            </ol>
          </nav>
          <h1>{title}</h1>
          <p>{intro || 'Mobilier, art de la table et décoration à louer, livrés et installés. Ajoutez vos articles au panier puis choisissez vos dates : le total, livraison comprise, est calculé en ligne.'}</p>
        </header>

        <div className="shop-container">
          <div className="shop-chips shop-chips-scroll" role="navigation" aria-label="Catégories">
            <Link href={queryString({ tri: sort || null })} className={`shop-chip${!categoryKey ? ' is-active' : ''}`} scroll={false}>
              Tout <span>{allTotal}</span>
            </Link>
            {chips.map(c => (
              <Link key={c.key} href={queryString({ categorie: c.key, tri: sort || null })} className={`shop-chip${categoryKey === c.key ? ' is-active' : ''}`} scroll={false}>
                {c.label} <span>{c.count}</span>
              </Link>
            ))}
          </div>

          <div className="shop-toolbar">
            <p className="shop-amount">{total > 0 ? <><strong>{total}</strong> article{total > 1 ? 's' : ''}{pageCount > 1 && <> · {first}–{last}</>}</> : 'Aucun article'}</p>
            <div className="shop-toolbar-controls">
              <label className="shop-select">
                <span>Trier</span>
                <select value={sort} onChange={e => go({ tri: e.target.value || null, p: null })}>
                  {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </label>
              <label className="shop-select">
                <span>Afficher</span>
                <select value={String(limit)} onChange={e => go({ limit: e.target.value === String(DEFAULT_LIMIT) ? null : e.target.value, p: null })}>
                  {LIMITS.map(l => <option key={l} value={String(l)}>{l === 'all' ? 'Tout' : `${l} par page`}</option>)}
                </select>
              </label>
            </div>
          </div>

          {cards.length > 0 ? (
            <div className="shop-grid">
              {cards.map((card, i) => (
                <ShopCard key={card.key} card={card} inCart={inCartOf(card)} onQuickView={setQuick} eager={i < 4} />
              ))}
            </div>
          ) : (
            <p className="shop-empty">Aucun article disponible dans cette catégorie pour le moment.</p>
          )}

          <Pages page={page} pageCount={pageCount} hrefFor={hrefFor} />

          <aside className="shop-help">
            <div>
              <h2>Un projet sur mesure ?</h2>
              <p>Décoration complète, scénographie, grandes quantités : notre équipe vous prépare un devis.</p>
            </div>
            <Link href="/contact" className="shop-btn shop-btn-ghost">Demander un devis</Link>
          </aside>
        </div>
      </div>

      {quick && <QuickView card={quick} onClose={() => setQuick(null)} />}
    </>
  )
}

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import ShopCard from './ShopCard.jsx'
import QuickView from './QuickView.jsx'
import { CATALOGUE_SORTS } from '../../lib/catalogue-pages.js'
import { catalogueCategoryHref, useCatalogueCart } from './productUtils.js'

const ALL_PATH = '/catalogue/complet'
const withSort = (path, tri) => (tri ? `${path}?tri=${encodeURIComponent(tri)}` : path)

// Shop listing body: category chips, sorting and a quick view on every card.
// No pagination: the whole selection is on one scrolling page. `children`
// (the SEO copy of a category) comes after the grid.
export default function CatalogueListing({ cards, allTotal, sort, chips, categoryKey, title, h1, intro, children }) {
  const router = useRouter()
  const cart = useCatalogueCart()
  const [quick, setQuick] = useState(null)
  const path = categoryKey ? catalogueCategoryHref(categoryKey) : ALL_PATH
  const inCartOf = card => card.variants.reduce((n, v) => n + (cart[v.id] || 0), 0)

  return (
    <>
      <div className="site-wrap shop-listing">
        <header className="shop-listing-head">
          <nav aria-label="Fil d'Ariane">
            <ol className="shop-crumbs">
              <li><Link href="/">Accueil</Link></li>
              <li><Link href="/catalogue">Catalogue</Link></li>
              <li aria-current="page">{title}</li>
            </ol>
          </nav>
          <h1>{h1 || title}</h1>
          <p>{intro || 'Mobilier, art de la table et décoration à louer, livrés et installés. Ajoutez vos articles au panier puis choisissez vos dates : le total, livraison comprise, est calculé en ligne.'}</p>
        </header>

        <div className="shop-container">
          <div className="shop-chips shop-chips-scroll" role="navigation" aria-label="Catégories">
            <Link href={withSort(ALL_PATH, sort)} className={`shop-chip${!categoryKey ? ' is-active' : ''}`} scroll={false}>
              Tout <span>{allTotal}</span>
            </Link>
            {chips.map(c => (
              <Link key={c.key} href={withSort(catalogueCategoryHref(c.key), sort)} className={`shop-chip${categoryKey === c.key ? ' is-active' : ''}`} scroll={false}>
                {c.label} <span>{c.count}</span>
              </Link>
            ))}
          </div>

          <div className="shop-toolbar">
            <p className="shop-amount">{cards.length > 0 ? <><strong>{cards.length}</strong> article{cards.length > 1 ? 's' : ''}</> : 'Aucun article'}</p>
            <div className="shop-toolbar-controls">
              <label className="shop-select">
                <span>Trier</span>
                <select value={sort} onChange={e => router.push(withSort(path, e.target.value), undefined, { scroll: false })}>
                  {CATALOGUE_SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
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

          {children}

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

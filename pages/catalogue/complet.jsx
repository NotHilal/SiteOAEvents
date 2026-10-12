import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Seo from '../../src/components/Seo.jsx'
import { useRouter } from 'next/router'
import { supabase } from '../../src/lib/supabase.js'
import { getUnitPriceTtc, groupTiersByMaterial, getMinOrderQty } from '../../src/lib/pricing.js'
import { CART_EVENT, getCatalogueCart, setCatalogueCart, sendCatalogueCartToReservation } from '../../src/lib/cart.js'
import { track } from '../../src/lib/analytics.js'
import InfoTooltip from '../../src/components/InfoTooltip.jsx'
import { slugify } from '../../src/lib/slug.js'
import { categoryTitle, sortCategories } from '../../src/lib/catalogue-pages.js'

const PAGE_HEADER_DEFAULT = 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=1600&q=75&auto=format&fit=crop'
const MAT_PER_PAGE = 15

const productHref = slug => `/catalogue/${slug}`

// One card per product: a simple article is its own card; the options of
// an article à options (Poids de lestage 15 kg / 30 kg…) are folded into
// a single card under the article's name, since they're chosen on its
// product page. Only available items reach this page, so an option that's
// switched off simply isn't counted.
function buildCards(materials, products) {
  const productById = Object.fromEntries((products || []).map(p => [String(p.id), p]))
  const cards = []
  const byProduct = {}
  for (const m of materials) {
    const product = m.product_id && productById[String(m.product_id)]
    if (!product) {
      cards.push({ key: `m:${m.id}`, kind: 'single', name: m.name, category: m.category || 'Autre', slug: m.slug || slugify(m.name), imageUrl: m.image_url, materials: [m] })
      continue
    }
    let card = byProduct[product.id]
    if (!card) {
      card = byProduct[product.id] = { key: `p:${product.id}`, kind: 'multiple', name: product.name, category: product.category || m.category || 'Autre', slug: product.slug, imageUrl: null, materials: [] }
      cards.push(card)
    }
    card.materials.push(m)
  }
  for (const card of Object.values(byProduct)) {
    card.materials.sort((a, b) => (a.variant_order ?? 0) - (b.variant_order ?? 0))
    card.imageUrl = card.materials.find(m => m.image_url)?.image_url || null
  }
  return cards
}

export default function Catalogue() {
  const router = useRouter()
  const [materialsData, setMaterialsData] = useState([])
  const [productsData, setProductsData] = useState([])
  // Filter pills: the categories managed in Espace OA > Catalogue, in their
  // tile order.
  const [categoriesData, setCategoriesData] = useState([])
  const [tiersByMaterial, setTiersByMaterial] = useState({})
  const [loaded, setLoaded] = useState(false)
  const [cart, setCart] = useState({})
  const [matFilter, setMatFilter] = useState('all')
  const [matSearch, setMatSearch] = useState('')
  const [matPage, setMatPage] = useState(1)

  useEffect(() => {
    setCart(getCatalogueCart())
    Promise.all([
      supabase.from('materials').select('*').eq('available', true).order('category'),
      supabase.from('material_price_tiers').select('*'),
      supabase.from('products').select('*'),
      supabase.from('categories').select('*'),
    ]).then(([matRes, tierRes, prodRes, catRes]) => {
      setCategoriesData(sortCategories(catRes.data || []))
      setMaterialsData(matRes.data || [])
      setProductsData(prodRes.data || [])
      setTiersByMaterial(groupTiersByMaterial(tierRes.data || []))
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    const syncCart = () => setCart(getCatalogueCart())
    window.addEventListener(CART_EVENT, syncCart)
    window.addEventListener('storage', syncCart)
    return () => {
      window.removeEventListener(CART_EVENT, syncCart)
      window.removeEventListener('storage', syncCart)
    }
  }, [])

  useEffect(() => { setMatPage(1) }, [matFilter, matSearch])

  // ?categorie=TABLES (breadcrumb/category links on product pages) opens
  // the catalogue on that filter.
  useEffect(() => {
    const cat = router.query.categorie
    if (loaded && typeof cat === 'string' && (categoriesData.some(c => c.name === cat) || materialsData.some(m => (m.category || 'Autre') === cat))) setMatFilter(cat)
  }, [loaded, router.query.categorie, materialsData, categoriesData])

  // The whole card opens the product page, except clicks on its own
  // controls (Ajouter, −/+, the info button and its popup).
  function openCard(e, card) {
    if (e.target.closest('button, a, input, .info-tip')) return
    router.push(productHref(card.slug))
  }

  function updateCart(next) {
    // Count only items going from 0 to >0 as an "add to cart" conversion.
    const added = Object.keys(next).some(id => (next[id] || 0) > 0 && !(cart[id] > 0))
    setCart(next)
    setCatalogueCart(next)
    if (added) track('Ajout panier', { emplacement: 'catalogue' })
  }

  // No date has been picked yet on this page — the weekday rate is shown as
  // an honest "starting from" estimate; the exact TTC price (weekday vs
  // weekend/holiday) is only known once a date is chosen in the reservation
  // wizard, same as everywhere else pricing is date-dependent in this app.
  function startingPrice(m, qty) {
    const tiers = tiersByMaterial[String(m.id)]
    return getUnitPriceTtc(tiers, 'weekday', qty)
  }

  const cards = useMemo(() => buildCards(materialsData, productsData), [materialsData, productsData])
  const cardsByCategory = cards.reduce((acc, c) => {
    ;(acc[c.category] ||= []).push(c)
    return acc
  }, {})
  const categoryMenu = [
    { value: 'all', label: 'Tous', count: cards.length },
    ...categoriesData.map(category => ({
      value: category.name,
      label: categoryTitle(category),
      count: cardsByCategory[category.name]?.length || 0,
    })),
  ]

  // Search matches the card's name, or one of its options' names
  // ("30 kg" still finds Poids de lestage).
  const filteredMats = cards.filter(c => {
    if (matFilter !== 'all' && c.category !== matFilter) return false
    const q = matSearch.trim().toLowerCase()
    if (q && !c.name.toLowerCase().includes(q) && !c.materials.some(m => m.name.toLowerCase().includes(q))) return false
    return true
  })
  const matTotalPages = Math.max(1, Math.ceil(filteredMats.length / MAT_PER_PAGE))
  const matPageSafe = Math.min(matPage, matTotalPages)
  const pagedMats = filteredMats.slice((matPageSafe - 1) * MAT_PER_PAGE, matPageSafe * MAT_PER_PAGE)

  const cartEntries = useMemo(() => Object.entries(cart).filter(([, q]) => q > 0), [cart])
  const cartCount = cartEntries.reduce((sum, [, q]) => sum + q, 0)
  const cartTotal = cartEntries.reduce((sum, [id, q]) => {
    const m = materialsData.find(x => String(x.id) === id)
    return m ? sum + startingPrice(m, q) * q : sum
  }, 0)

  return (
    <>
      <Seo
        title="Catalogue : location de mobilier et de décoration"
        description="Parcourez notre catalogue de mobilier et de décoration à louer pour vos réceptions : chaises, tables, art de la table, luminaires et plus encore."
        path="/catalogue/complet"
        breadcrumb={[{ name: 'Catalogue complet', path: '/catalogue/complet' }]}
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

        <section className="oa-section oa-catalogue-section">
          <div className="oa-container">
            <div className="oa-section-head" data-reveal>
              <span className="oa-eyebrow">À la location</span>
              <h2 className="oa-heading" style={{ fontSize: 'var(--oa-size-h1)' }}>Composez votre sélection</h2>
              <p className="oa-text-muted" style={{ maxWidth: 620, margin: '10px auto 0' }}>
                Ajoutez les articles qui vous intéressent, puis lancez votre demande de réservation avec votre sélection déjà prête — les prix affichés sont estimatifs et le tarif définitif dépend de la date choisie.
              </p>
            </div>

            {!loaded && <p className="no-mat-msg"><i className="fas fa-circle-notch fa-spin me-2" />Chargement du catalogue…</p>}
            {loaded && !materialsData.length && (
              <p className="no-mat-msg"><i className="fas fa-info-circle me-2" />Aucun article disponible pour le moment.</p>
            )}

            {loaded && materialsData.length > 0 && (
              <>
                <div className="mat-toolbar oa-catalogue-toolbar" data-reveal>
                  <div className="mat-search">
                    <i className="fas fa-search" />
                    <input
                      type="text"
                      aria-label="Rechercher dans le catalogue"
                      placeholder="Rechercher un article…"
                      value={matSearch}
                      onChange={e => setMatSearch(e.target.value)}
                    />
                    {matSearch && (
                      <button className="mat-search-clear" onClick={() => setMatSearch('')}>
                        <i className="fas fa-times" />
                      </button>
                    )}
                  </div>
                  <div className="oa-catalogue-filter-scroll">
                    <div className="mat-filter-pills" role="toolbar" aria-label="Filtrer le catalogue par catégorie">
                      {categoryMenu.map(category => (
                        <button
                          key={category.value}
                          type="button"
                          className={`mat-filter-pill${matFilter === category.value ? ' active' : ''}`}
                          aria-pressed={matFilter === category.value}
                          onClick={() => setMatFilter(category.value)}
                        >
                          {category.label} <span className="mat-filter-count">{category.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {!filteredMats.length ? (
                  <p className="no-mat-msg"><i className="fas fa-info-circle me-2" />{matFilter !== 'all' && !matSearch.trim() ? 'Aucun article dans cette catégorie pour le moment.' : 'Aucun article ne correspond à votre recherche.'}</p>
                ) : (
                  <div className="mat-grid" data-reveal>
                    {pagedMats.map(card => {
                      if (card.kind === 'multiple') {
                        // Article à options: one card, "dès" the cheapest
                        // option, and a "Choisir" button to its product
                        // page where the option is picked.
                        const prices = card.materials.map(m => startingPrice(m, getMinOrderQty(tiersByMaterial[String(m.id)]))).filter(p => p > 0)
                        const fromPrice = prices.length ? Math.min(...prices) : 0
                        const inCart = card.materials.reduce((n, m) => n + (cart[String(m.id)] || 0), 0)
                        const labels = card.materials.map(m => m.variant_label || m.name)
                        return (
                          <div key={card.key} className={`mat-card mat-card-catalogue mat-card-link${inCart ? ' mat-card-checked' : ''}`} onClick={e => openCard(e, card)}>
                            <Link href={productHref(card.slug)} className={`mat-card-img${!card.imageUrl?' mat-card-img-empty':''}`} tabIndex={-1} aria-hidden="true">
                              {card.imageUrl ? <img src={card.imageUrl} alt="" loading="lazy" decoding="async" /> : <i className="fas fa-image" />}
                            </Link>
                            <div className="mat-card-body">
                              <div className="mat-name-row">
                                <Link href={productHref(card.slug)} className="mat-name">{card.name}</Link>
                                <span className="mat-price">{fromPrice > 0 ? `dès ${fromPrice.toFixed(2)} €` : ''}</span>
                              </div>
                              <span className="mat-desc mat-options-summary">{labels.length} options : {labels.join(' · ')}</span>
                              <div className="mat-card-footer">
                                <span className="mat-stock-badge mat-stock-ok"><i className="fas fa-check-circle" /> {inCart ? `${inCart} dans votre sélection` : 'Disponible'}</span>
                                <div className="mat-card-footer-right">
                                  <span className="mat-info-slot" aria-hidden="true" />
                                  <Link href={productHref(card.slug)} className="mat-add-btn mat-choose-btn" aria-label={`Choisir une option de ${card.name}`}>
                                    Choisir <i className="fas fa-arrow-right" />
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      const m = card.materials[0]
                      const tiers = tiersByMaterial[String(m.id)]
                      const minQty = getMinOrderQty(tiers)
                      const qty = cart[String(m.id)] || 0
                      const selected = qty > 0
                      const unitPrice = startingPrice(m, qty || minQty)
                      const maxQty = m.max_quantity || 999
                      return (
                        <div key={card.key} className={`mat-card mat-card-catalogue mat-card-link${selected?' mat-card-checked':''}`} onClick={e => openCard(e, card)}>
                          <Link href={productHref(card.slug)} className={`mat-card-img${!m.image_url?' mat-card-img-empty':''}`} tabIndex={-1} aria-hidden="true">
                            {m.image_url ? <img src={m.image_url} alt="" loading="lazy" decoding="async" /> : <i className="fas fa-image" />}
                          </Link>
                          <div className="mat-card-body">
                            <div className="mat-name-row">
                              <Link href={productHref(card.slug)} className="mat-name">{m.name}</Link>
                              <span className="mat-price">{unitPrice > 0 ? `dès ${unitPrice.toFixed(2)} €` : ''}</span>
                            </div>
                            {minQty > 1 && <span className="mat-desc" style={{fontSize:'.75rem',color:'var(--gray)'}}>Minimum {minQty} unités</span>}
                            <div className="mat-card-footer">
                              <span className="mat-stock-badge mat-stock-ok"><i className="fas fa-check-circle" /> Disponible</span>
                              <div className="mat-card-footer-right">
                                {/* Fixed slot left of the button: the icon when the item has
                                    a description, empty space otherwise — so every "Ajouter"
                                    sits at exactly the same spot. */}
                                {m.description ? (
                                  <InfoTooltip label={`Informations sur ${m.name}`} title={m.name} className="mat-info-btn">
                                    <p>{m.description}</p>
                                    {minQty > 1 && <p className="info-tip-meta">Minimum {minQty} unités</p>}
                                  </InfoTooltip>
                                ) : (
                                  <span className="mat-info-slot" aria-hidden="true" />
                                )}
                                {selected ? (
                                  <div className="mat-qty-wrap">
                                    <button className="qty-btn" onClick={() => {
                                      const next = Math.max(0, qty - 1)
                                      const n = { ...cart }
                                      if (next < minQty) delete n[String(m.id)]
                                      else n[String(m.id)] = next
                                      updateCart(n)
                                    }}>−</button>
                                    <span className="qty-val">{qty}</span>
                                    <button className="qty-btn" onClick={() => updateCart({ ...cart, [String(m.id)]: Math.min(maxQty, qty + 1) })}>+</button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="mat-add-btn"
                                    onClick={() => updateCart({ ...cart, [String(m.id)]: minQty })}
                                  >
                                    <i className="fas fa-plus" /> Ajouter
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {matTotalPages > 1 && (
                  <div className="mat-pagination">
                    <button className="mat-page-nav" aria-label="Page précédente" disabled={matPageSafe<=1} onClick={() => setMatPage(p => Math.max(1, p-1))}>
                      <i className="fas fa-chevron-left" />
                    </button>
                    <span className="mat-page-info">Page {matPageSafe} / {matTotalPages}</span>
                    <button className="mat-page-nav" aria-label="Page suivante" disabled={matPageSafe>=matTotalPages} onClick={() => setMatPage(p => Math.min(matTotalPages, p+1))}>
                      <i className="fas fa-chevron-right" />
                    </button>
                  </div>
                )}
              </>
            )}

          </div>
        </section>

        {cartCount > 0 && (
          <div className="oa-catalogue-cartbar">
            <div className="oa-container oa-catalogue-cartbar-inner">
              <div className="oa-catalogue-cartbar-info">
                <span className="oa-catalogue-cartbar-count">{cartCount} article{cartCount>1?'s':''}</span>
                <span className="oa-catalogue-cartbar-total">≈ {cartTotal.toFixed(2)} €</span>
              </div>
              <div className="oa-catalogue-cartbar-actions">
                <button type="button" className="oa-catalogue-cartbar-clear" onClick={() => updateCart({})}>
                  <i className="fas fa-trash" /> Vider
                </button>
                <button type="button" className="btn btn-rose-gold" onClick={() => sendCatalogueCartToReservation(router)}>
                  Réserver ma sélection <i className="fas fa-arrow-right" style={{marginLeft:8}} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

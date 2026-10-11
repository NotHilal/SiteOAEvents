import { useState } from 'react'
import ProductLayout from './ProductLayout.jsx'
import QtyStepper from './QtyStepper.jsx'
import { ProductFacts, TariffTable } from './ProductFacts.jsx'
import AddToCartNotice, { addVariantToCart, plural } from './AddToCartNotice.jsx'
import { formatEuro, minQtyOf, unitPriceOf, useCatalogueCart } from './productUtils.js'
import { track } from '../../lib/analytics.js'

// "Multiple Options" template (options.fr, /example/product-multiple): the
// variants as rows (Produit / Prix / Quantité), each with its own quantity
// pill, and one "Ajouter au panier" for every row with a quantity — so
// 2 × 15 kg and 4 × 30 kg can go in together, each as its own cart line.
//
// The row last clicked or changed is the selected variant: highlighted,
// and the picture, facts, description and rates follow it, since variants
// can differ in all of those.
export default function ProductMultiple({ product, variants, activeVariantId, related }) {
  const firstAvailable = variants.find(v => v.available) || variants[0]
  const [activeId, setActiveId] = useState(activeVariantId || firstAvailable.id)
  const [quantities, setQuantities] = useState({})
  const [notice, setNotice] = useState(null)
  const cart = useCatalogueCart()

  const active = variants.find(v => v.id === activeId) || firstAvailable
  // A variant without its own photo shows a sibling's, labelled as such so
  // it's never mistaken for the selected item.
  const imageVariant = active.imageUrl ? active : variants.find(v => v.imageUrl)
  const imageCaption = imageVariant && imageVariant !== active ? `Photo : ${imageVariant.variantLabel || imageVariant.name}` : null
  const chosen = variants.filter(v => (quantities[v.id] || 0) > 0)
  const activeInCart = cart[active.id] || 0

  function setQty(v, q) {
    setQuantities(prev => ({ ...prev, [v.id]: q }))
    setActiveId(v.id)
    setNotice(null)
  }

  function add() {
    let requested = 0
    let added = 0
    for (const v of chosen) {
      requested += quantities[v.id]
      added += addVariantToCart(v, quantities[v.id])
    }
    if (added > 0) track('Ajout panier', { emplacement: 'fiche produit' })
    setNotice(added < requested
      ? { limited: true, text: added > 0 ? `Stock limité : ${plural(added, 'article')} ajouté${added > 1 ? 's' : ''}.` : 'Quantité maximale déjà dans votre sélection.' }
      : { text: `${plural(added, 'article')} ajouté${added > 1 ? 's' : ''} à votre sélection.` })
    setQuantities({})
  }

  return (
    <ProductLayout product={product} image={imageVariant?.imageUrl} imageAlt={imageVariant?.name} imageCaption={imageCaption} related={related}>
      <div className="pdp-name">
        <h1><span>Location</span> {product.name}</h1>
      </div>

      {product.description && <div className="pdp-overview pdp-overview-multi"><p>{product.description}</p></div>}

      <table className="pdp-grouped">
        <thead>
          <tr>
            <th scope="col">Produit</th>
            <th scope="col" className="pdp-num">Prix</th>
            <th scope="col" className="pdp-qty-col">Quantité</th>
          </tr>
        </thead>
        <tbody>
          {variants.map(v => {
            const minQty = minQtyOf(v)
            const qty = quantities[v.id] || 0
            const price = unitPriceOf(v, qty || minQty)
            const isActive = v.id === active.id
            return (
              <tr
                key={v.id}
                className={`${isActive ? 'is-active' : ''}${v.available ? '' : ' is-unavailable'}`}
                onClick={e => { if (!e.target.closest('.pdp-qty')) setActiveId(v.id) }}
              >
                <td className="pdp-grouped-name">
                  <button type="button" className="pdp-variant-btn" aria-pressed={isActive} onClick={() => setActiveId(v.id)}>
                    {v.name}
                  </button>
                  {(!v.available || minQty > 1) && (
                    <span className="pdp-variant-meta">{!v.available ? 'Indisponible' : `Minimum ${minQty} unités`}</span>
                  )}
                </td>
                <td className="pdp-num pdp-grouped-price">{price > 0 ? `dès ${formatEuro(price)}` : ''}</td>
                <td className="pdp-qty-col">
                  <QtyStepper
                    variant="row"
                    value={qty}
                    onChange={q => setQty(v, q)}
                    min={minQty}
                    max={v.maxQuantity}
                    allowZero
                    disabled={!v.available}
                    label={v.name}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="pdp-tocart pdp-tocart-multi">
        <button type="button" className="pdp-add" onClick={add} disabled={!chosen.length}>
          Ajouter au panier
        </button>
        {!chosen.length && <span className="pdp-hint">Indiquez une quantité pour au moins un modèle.</span>}
      </div>
      <AddToCartNotice notice={notice} />

      <section className="pdp-variant-detail" aria-label={`Détails : ${active.name}`}>
        <ProductFacts variant={active} category={product.category} showVariant qty={quantities[active.id] || undefined} />
        {activeInCart > 0 && <p className="pdp-in-cart">Dans votre sélection : {plural(activeInCart, 'unité')}</p>}
        {active.description && <div className="pdp-overview"><p>{active.description}</p></div>}
        <TariffTable variant={active} />
      </section>
    </ProductLayout>
  )
}

import { useState } from 'react'
import ProductLayout from './ProductLayout.jsx'
import QtyStepper from './QtyStepper.jsx'
import { ProductFacts, TariffTable } from './ProductFacts.jsx'
import AddToCartNotice, { addVariantToCart, plural } from './AddToCartNotice.jsx'
import { minQtyOf, useCatalogueCart } from './productUtils.js'
import { track } from '../../lib/analytics.js'

// "Single Option" template (options.fr, /example/product-single): one
// purchasable configuration — title, reference-style facts, description,
// quantity pill + "Ajouter au panier".
export default function ProductSingle({ product, variant, related }) {
  const minQty = minQtyOf(variant)
  const [qty, setQty] = useState(minQty)
  const [notice, setNotice] = useState(null)
  const cart = useCatalogueCart()
  const inCart = cart[variant.id] || 0
  const atStockLimit = variant.maxQuantity != null && inCart >= variant.maxQuantity
  const description = product.description || variant.description

  function add() {
    const added = addVariantToCart(variant, qty)
    if (added > 0) track('Ajout panier', { emplacement: 'fiche produit' })
    setNotice(added < qty
      ? { limited: true, text: added > 0 ? `Stock limité : ${plural(added, 'unité')} ajoutée${added > 1 ? 's' : ''}.` : 'Quantité maximale déjà dans votre sélection.' }
      : { text: `${plural(added, 'unité')} ajoutée${added > 1 ? 's' : ''} à votre sélection.` })
    setQty(minQty)
  }

  return (
    <ProductLayout product={product} image={variant.imageUrl} imageAlt={product.name} related={related}>
      <div className="pdp-name">
        <h1><span>Location</span> {product.name}</h1>
      </div>

      <ProductFacts variant={variant} category={product.category} qty={qty} />

      {description && <div className="pdp-overview"><p>{description}</p></div>}

      <div className="pdp-tocart">
        <QtyStepper
          value={qty}
          onChange={q => { setQty(q); setNotice(null) }}
          min={minQty}
          max={variant.maxQuantity}
          disabled={!variant.available}
          label={product.name}
        />
        <button type="button" className="pdp-add" onClick={add} disabled={!variant.available || atStockLimit}>
          {variant.available ? 'Ajouter au panier' : 'Indisponible'}
        </button>
      </div>
      {inCart > 0 && <p className="pdp-in-cart">Dans votre sélection : {plural(inCart, 'unité')}</p>}
      <AddToCartNotice notice={notice} />

      <TariffTable variant={variant} />
    </ProductLayout>
  )
}

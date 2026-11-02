import { useState } from 'react'
import Link from 'next/link'
import Icon from '../Icon.jsx'
import { formatEuro, categoryLabel } from './productUtils.js'
import { addToCatalogueCart } from '../../lib/cart.js'
import { track } from '../../lib/analytics.js'

const LOW_STOCK = 10

// Product card of the catalogue and the homepage selection (cards from
// src/lib/catalogue-cards.js): uniform square photo (second photo on
// hover), badges, quick view, add to cart, name, "from" price and stock.
export default function ShopCard({ card, inCart = 0, onQuickView, eager = false, place = 'catalogue' }) {
  const [added, setAdded] = useState(false)
  const href = `/catalogue/${card.slug}`
  const multiple = card.variants.length > 1
  const first = card.variants[0]

  function add() {
    addToCatalogueCart(first.id, inCart > 0 ? 1 : first.minQty, first.maxQty)
    if (!inCart) track('Ajout panier', { emplacement: place })
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  return (
    <article className="shop-card">
      <div className="shop-card-media">
        <Link href={href} className="shop-card-photo" tabIndex={-1} aria-hidden="true">
          {card.imageUrl ? (
            <>
              <img src={card.imageUrl} alt={`Location ${card.name}`} loading={eager ? 'eager' : 'lazy'} decoding="async" />
              {card.hoverImageUrl && <img src={card.hoverImageUrl} alt="" loading="lazy" decoding="async" className="shop-card-photo-alt" />}
            </>
          ) : (
            <span className="shop-card-photo-empty"><Icon name="image" size={40} strokeWidth={1} /></span>
          )}
        </Link>
        <div className="shop-card-badges">
          {multiple && <span className="shop-badge">{card.variants.length} options</span>}
          {card.stock > 0 && card.stock <= LOW_STOCK && <span className="shop-badge shop-badge-warn">Stock limité</span>}
          {inCart > 0 && <span className="shop-badge shop-badge-dark">{inCart} au panier</span>}
        </div>
        <div className="shop-card-actions">
          {onQuickView && (
            <button type="button" className="shop-card-action" onClick={() => onQuickView(card)} aria-label={`Aperçu rapide : ${card.name}`}>
              <i className="far fa-eye" /><span>Aperçu</span>
            </button>
          )}
          {multiple ? (
            <button type="button" className="shop-card-action is-primary" onClick={() => onQuickView ? onQuickView(card) : null} aria-label={`Choisir une option de ${card.name}`}>
              <i className="fas fa-sliders-h" /><span>Choisir</span>
            </button>
          ) : (
            <button type="button" className={`shop-card-action is-primary${added ? ' is-added' : ''}`} onClick={add} aria-label={added ? `${card.name} ajouté au panier` : `Ajouter ${card.name} au panier`}>
              <i className={`fas ${added ? 'fa-check' : 'fa-shopping-bag'}`} /><span>{added ? 'Ajouté' : 'Ajouter'}</span>
            </button>
          )}
        </div>
      </div>
      <div className="shop-card-body">
        <p className="shop-card-cat">{categoryLabel(card.category)}</p>
        <h3 className="shop-card-name"><Link href={href}>{card.name}</Link></h3>
        <div className="shop-card-foot">
          {card.fromPrice > 0
            ? <p className="shop-card-price"><span>dès</span> <strong>{formatEuro(card.fromPrice)}</strong></p>
            : <p className="shop-card-price"><span>Prix selon la date</span></p>}
          <p className={`shop-card-stock${card.stock > 0 ? '' : ' is-out'}`}>
            <span className="shop-dot" aria-hidden="true" />{card.stock > 0 ? 'En stock' : 'Sur demande'}
          </p>
        </div>
      </div>
    </article>
  )
}

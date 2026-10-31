import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import ProductGallery from './ProductGallery.jsx'
import QtyStepper from './QtyStepper.jsx'
import AvailabilityCheck from './AvailabilityCheck.jsx'
import { formatEuro, useCatalogueCart, categoryLabel } from './productUtils.js'
import { addToCatalogueCart, openCartDrawer, sendCatalogueCartToReservation } from '../../lib/cart.js'
import { track } from '../../lib/analytics.js'

// "Aperçu rapide" dialog opened from a catalogue / homepage card: photos
// with zoom, option choice, quantity, live availability, add to cart or
// book straight away — without leaving the listing.
export default function QuickView({ card, onClose }) {
  const router = useRouter()
  const cart = useCatalogueCart()
  const [variantId, setVariantId] = useState(card.variants[0].id)
  const variant = card.variants.find(v => v.id === variantId) || card.variants[0]
  const [qty, setQty] = useState(variant.minQty)
  const [dates, setDates] = useState([])
  const [added, setAdded] = useState(0)
  const closeRef = useRef(null)
  const inCart = cart[variant.id] || 0
  const room = variant.maxQty ? Math.max(0, variant.maxQty - inCart) : null

  useEffect(() => { setQty(variant.minQty); setAdded(0) }, [variant.id])

  // Modal behaviour: focus inside, Escape closes (unless the photo viewer
  // is open on top), page scroll paused.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape' && !document.querySelector('.yarl__root')) onCloseRef.current() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    window.__lenis?.stop()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      window.__lenis?.start()
    }
  }, [])

  function add() {
    const before = cart[variant.id] || 0
    const after = addToCatalogueCart(variant.id, qty, variant.maxQty)[variant.id] || 0
    if (after > before) track('Ajout panier', { emplacement: 'aperçu rapide' })
    setAdded(after - before)
    return after - before
  }

  function bookNow() {
    if (!inCart) add()
    track('Clic Réserver', { emplacement: 'aperçu rapide' })
    sendCatalogueCartToReservation(router, { dates })
  }

  const images = variant.images?.length ? variant.images : card.variants.flatMap(v => v.images || [])

  return (
    <div className="shop-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="shop-modal" data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby="shop-qv-title">
        <button ref={closeRef} type="button" className="shop-modal-close" onClick={onClose} aria-label="Fermer l’aperçu">
          <i className="fas fa-times" />
        </button>
        <div className="shop-qv">
          <div className="shop-qv-media">
            <ProductGallery images={images} alt={card.name} compact />
          </div>
          <div className="shop-qv-info">
            <p className="shop-eyebrow">{categoryLabel(card.category)}</p>
            <h2 id="shop-qv-title" className="shop-qv-title">{card.name}</h2>
            <p className="shop-qv-price">
              {variant.price > 0
                ? <><span>à partir de</span> <strong>{formatEuro(variant.price)}</strong> <span>TTC / unité</span></>
                : <span>Prix selon la date</span>}
            </p>
            {variant.weekendPrice > 0 && variant.weekendPrice !== variant.price && (
              <p className="shop-qv-note">Week-end et jours fériés : {formatEuro(variant.weekendPrice)} TTC / unité</p>
            )}
            {(variant.description || card.description) && <p className="shop-qv-desc">{variant.description || card.description}</p>}

            {card.variants.length > 1 && (
              <div className="shop-qv-options" role="radiogroup" aria-label="Option">
                <p className="shop-label">Option</p>
                <div className="shop-chips">
                  {card.variants.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      role="radio"
                      aria-checked={v.id === variant.id}
                      className={`shop-chip${v.id === variant.id ? ' is-active' : ''}`}
                      onClick={() => setVariantId(v.id)}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="shop-qv-buy">
              <QtyStepper value={qty} onChange={q => { setQty(q); setAdded(0) }} min={variant.minQty} max={room || null} disabled={room === 0} label={card.name} />
              <button type="button" className="shop-btn shop-btn-dark" onClick={add} disabled={room === 0}>
                <i className="fas fa-shopping-bag" /> {room === 0 ? 'Quantité max. au panier' : 'Ajouter au panier'}
              </button>
            </div>
            <p className="shop-qv-meta">
              {variant.minQty > 1 && <span>Minimum {variant.minQty} unités · </span>}
              {variant.maxQty ? <span>{variant.maxQty} en stock</span> : null}
              {inCart > 0 && <span> · {inCart} dans votre panier</span>}
            </p>
            {added > 0 && (
              <p className="shop-qv-added" role="status">
                <i className="fas fa-check" /> {added} ajouté{added > 1 ? 's' : ''} au panier.{' '}
                <button type="button" className="shop-link" onClick={() => { onClose(); openCartDrawer() }}>Voir mon panier</button>
              </p>
            )}

            <AvailabilityCheck variantId={variant.id} qty={qty} onDates={setDates} />

            <div className="shop-qv-actions">
              <button type="button" className="shop-btn shop-btn-gold" onClick={bookNow} disabled={room === 0 && !inCart}>
                <i className="far fa-calendar-check" /> Réserver maintenant
              </button>
              <Link href={`/catalogue/${variant.slug || card.slug}`} className="shop-btn shop-btn-ghost" onClick={onClose}>
                Voir la fiche complète
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

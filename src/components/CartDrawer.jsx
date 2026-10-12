import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Icon from './Icon.jsx'
import { supabase } from '../lib/supabase.js'
import { getMinOrderQty, getUnitPriceTtc, groupTiersByMaterial } from '../lib/pricing.js'
import { sendCatalogueCartToReservation, setCatalogueCart } from '../lib/cart.js'
import { slugify } from '../lib/slug.js'

const priceFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export default function CartDrawer({ cart, closeRef, onClose, open }) {
  const router = useRouter()
  const [materials, setMaterials] = useState([])
  const [tiersByMaterial, setTiersByMaterial] = useState({})
  const [loading, setLoading] = useState(false)
  const ids = useMemo(
    () => Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([id]) => id),
    [cart],
  )
  const idsKey = ids.join(',')

  useEffect(() => {
    if (!open || !ids.length) {
      setLoading(false)
      if (!ids.length) {
        setMaterials([])
        setTiersByMaterial({})
      }
      return
    }

    let cancelled = false
    setLoading(true)
    Promise.all([
      supabase.from('materials').select('*').in('id', ids),
      supabase.from('material_price_tiers').select('*').in('material_id', ids),
    ]).then(([materialResult, tierResult]) => {
      if (cancelled) return
      setMaterials(materialResult.data || [])
      setTiersByMaterial(groupTiersByMaterial(tierResult.data || []))
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [open, idsKey])

  const materialById = useMemo(
    () => Object.fromEntries(materials.map(material => [String(material.id), material])),
    [materials],
  )

  const entries = ids.map(id => {
    const material = materialById[id]
    const quantity = cart[id]
    const tiers = tiersByMaterial[id] || []
    const unitPrice = material ? getUnitPriceTtc(tiers, 'weekday', quantity) : 0
    return { id, material, quantity, tiers, unitPrice }
  })
  const total = entries.reduce((sum, entry) => sum + entry.unitPrice * entry.quantity, 0)
  const count = entries.reduce((sum, entry) => sum + entry.quantity, 0)

  function updateQuantity(id, quantity) {
    const next = { ...cart }
    if (quantity > 0) next[id] = quantity
    else delete next[id]
    setCatalogueCart(next)
  }

  function decrease(entry) {
    const minimum = getMinOrderQty(entry.tiers)
    const nextQuantity = entry.quantity - 1
    updateQuantity(entry.id, nextQuantity < minimum ? 0 : nextQuantity)
  }

  function increase(entry) {
    const maximum = entry.material?.max_quantity || 999
    updateQuantity(entry.id, Math.min(maximum, entry.quantity + 1))
  }

  function reserve() {
    onClose()
    sendCatalogueCartToReservation(router)
  }

  return (
    <aside
      id="oah-cart-drawer"
      className={`oah-cart-drawer${open ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="oah-cart-title"
      inert={open ? undefined : ''}
    >
      <div className="oah-cart-head">
        <div>
          <span className="oah-cart-eyebrow">Votre sélection</span>
          <h2 id="oah-cart-title">Mon panier</h2>
        </div>
        <button ref={closeRef} type="button" className="oah-cart-close" onClick={onClose} aria-label="Fermer le panier">
          <Icon name="close" size={24} />
        </button>
      </div>

      {!ids.length ? (
        <div className="oah-cart-empty">
          <Icon name="cart" ion size={48} />
          <p>Votre panier est vide.</p>
          <Link href="/catalogue" onClick={onClose}>Découvrir le catalogue</Link>
        </div>
      ) : (
        <>
          <div className="oah-cart-content">
            <p className="oah-cart-summary">{count} article{count > 1 ? 's' : ''}</p>
            {loading && !materials.length ? (
              <p className="oah-cart-loading"><i className="fas fa-circle-notch fa-spin" /> Chargement du panier…</p>
            ) : (
              <ul className="oah-cart-list">
                {entries.map(entry => {
                  const { id, material, quantity, unitPrice } = entry
                  const slug = material?.slug || (material?.name ? slugify(material.name) : '')
                  return (
                    <li key={id} className="oah-cart-item">
                      {material && slug ? (
                        <Link href={`/catalogue/${slug}`} className="oah-cart-image" onClick={onClose} aria-label={`Voir ${material.name}`}>
                          {material.image_url ? <img src={material.image_url} alt="" /> : <Icon name="image" size={26} />}
                        </Link>
                      ) : (
                        <span className="oah-cart-image"><Icon name="image" size={26} /></span>
                      )}
                      <div className="oah-cart-item-main">
                        {material && slug ? (
                          <Link href={`/catalogue/${slug}`} className="oah-cart-item-name" onClick={onClose}>{material.name}</Link>
                        ) : (
                          <span className="oah-cart-item-name">Article du catalogue</span>
                        )}
                        {unitPrice > 0 && <span className="oah-cart-item-price">≈ {priceFormatter.format(unitPrice * quantity)} €</span>}
                        <div className="oah-cart-item-actions">
                          <div className="oah-cart-quantity" aria-label={`Quantité de ${material?.name || 'cet article'}`}>
                            <button type="button" onClick={() => decrease(entry)} aria-label="Diminuer la quantité">−</button>
                            <span>{quantity}</span>
                            <button type="button" onClick={() => increase(entry)} aria-label="Augmenter la quantité">+</button>
                          </div>
                          <button type="button" className="oah-cart-remove" onClick={() => updateQuantity(id, 0)}>Retirer</button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="oah-cart-footer">
            <div className="oah-cart-total">
              <span>Total estimatif</span>
              <strong>{total > 0 ? `≈ ${priceFormatter.format(total)} €` : 'Sur devis'}</strong>
            </div>
            <button type="button" className="oah-cart-reserve" onClick={reserve}>
              Réserver ma sélection <span aria-hidden="true">→</span>
            </button>
            <p>Le tarif définitif dépendra de la date choisie.</p>
          </div>
        </>
      )}
    </aside>
  )
}

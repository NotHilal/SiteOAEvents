import { useEffect, useState } from 'react'
import { getCatalogueCart, CART_EVENT } from '../../lib/cart.js'
import { getMinOrderQty, getUnitPriceTtc, ttcFromHt } from '../../lib/pricing.js'

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
export const formatEuro = n => euro.format(n)

// "OPTIONS & ACCESSOIRES" → "Options & accessoires" for running text; the
// breadcrumb keeps the stored uppercase name (it's set in capitals anyway).
export const categoryLabel = c => (c ? c.charAt(0) + c.slice(1).toLowerCase() : '')

export const catalogueCategoryHref = c => `/catalogue?categorie=${encodeURIComponent(c)}`

export const minQtyOf = variant => getMinOrderQty(variant.tiers)

// Same "starting from" figure the catalogue cards show: weekday TTC rate
// for the given quantity (the exact price depends on the date, chosen
// later in the booking wizard).
export const unitPriceOf = (variant, qty) => getUnitPriceTtc(variant.tiers, 'weekday', Math.max(qty, minQtyOf(variant)))

export const tierRows = variant => variant.tiers.map(t => ({
  range: t.max_qty == null
    ? (t.min_qty <= 1 ? 'Dès 1 unité' : `${t.min_qty} unités et plus`)
    : `${t.min_qty} à ${t.max_qty} unités`,
  weekday: ttcFromHt(t.price_weekday_ht),
  weekend: ttcFromHt(t.price_weekend_ht),
}))

// Live { materialId: qty } of the shared catalogue cart (src/lib/cart.js),
// kept in sync with additions made anywhere on the site.
export function useCatalogueCart() {
  const [cart, setCart] = useState({})
  useEffect(() => {
    const sync = () => setCart(getCatalogueCart())
    sync()
    window.addEventListener(CART_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CART_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return cart
}

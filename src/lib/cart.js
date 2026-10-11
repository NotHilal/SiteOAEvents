// Lightweight shared "catalogue cart" — { [materialId]: quantity } persisted
// to localStorage so it survives navigation between the homepage teaser and
// /catalogue, and a browser refresh. There is no separate checkout: the cart
// is handed off wholesale into the existing ReservationWizard via the same
// sessionStorage prefill mechanism /devis already uses to carry a simulation
// into a real request (see ReservationWizard.jsx's oa_devis_prefill effect),
// so building/pricing/availability logic never has to be duplicated.
const CART_KEY = 'oa_catalogue_cart'
export const CART_EVENT = 'oa-catalogue-cart-updated'

export function getCatalogueCart() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function setCatalogueCart(cart) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  window.dispatchEvent(new Event(CART_EVENT))
}

// Adds on top of what's already in the cart for that item (same rule as
// the catalogue's + button), capped at the item's stock when `maxQty` is
// given.
export function addToCatalogueCart(materialId, qty = 1, maxQty = null) {
  const cart = getCatalogueCart()
  const key = String(materialId)
  const total = (cart[key] || 0) + qty
  const next = { ...cart, [key]: maxQty ? Math.min(maxQty, total) : total }
  setCatalogueCart(next)
  return next
}

export function getCatalogueCartCount() {
  const cart = getCatalogueCart()
  return Object.values(cart).reduce((sum, q) => sum + (parseInt(q) || 0), 0)
}

export function clearCatalogueCart() {
  setCatalogueCart({})
}

// Hands the cart off to /reservation and clears it locally — mirrors what
// /devis's "Faire une vraie demande" button does with its own simulation
// state, just seeded with only `cart` (no dates/form yet).
export function sendCatalogueCartToReservation(router) {
  const cart = getCatalogueCart()
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('oa_devis_prefill', JSON.stringify({ cart }))
  }
  clearCatalogueCart()
  router.push('/reservation')
}

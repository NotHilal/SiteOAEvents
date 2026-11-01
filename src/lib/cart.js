// Lightweight shared cart — { [materialId]: quantity } persisted to
// localStorage so it survives navigation and a browser refresh. The checkout
// page (/commande) reads it directly and empties it once the order is paid.
// The event dates picked on a product page travel with it (CART_DATES_KEY).
const CART_KEY = 'oa_catalogue_cart'
const CART_DATES_KEY = 'oa_cart_dates'
export const CART_EVENT = 'oa-catalogue-cart-updated'
// Asks the header to slide its cart drawer open (Navbar.jsx listens).
export const OPEN_CART_EVENT = 'oa-open-cart'
export const openCartDrawer = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_CART_EVENT)) }

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

// Event days (consecutive YYYY-MM-DD) chosen for the cart, e.g. on a
// product page's availability check; preselected at checkout.
export function getCartDates() {
  if (typeof window === 'undefined') return []
  try {
    const list = JSON.parse(localStorage.getItem(CART_DATES_KEY) || '[]')
    return Array.isArray(list) ? list.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)) : []
  } catch {
    return []
  }
}

export function setCartDates(dates) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(CART_DATES_KEY, JSON.stringify(dates || [])) } catch {}
}

// Opens the checkout, keeping `dates` (if given) as the event days.
export function goToCheckout(router, { dates } = {}) {
  if (dates?.length) setCartDates(dates)
  router.push('/commande')
}

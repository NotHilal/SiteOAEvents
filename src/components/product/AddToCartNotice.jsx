import Link from 'next/link'
import { addToCatalogueCart, getCatalogueCart } from '../../lib/cart.js'

// Confirmation under the "Ajouter au panier" button; announced to screen
// readers through the live region.
export default function AddToCartNotice({ notice }) {
  return (
    <p className="pdp-notice" role="status" aria-live="polite">
      {notice && (
        <>
          <span className={notice.limited ? 'pdp-notice-warn' : 'pdp-notice-ok'}>{notice.text}</span>{' '}
          <Link href="/catalogue">Voir ma sélection</Link>
        </>
      )}
    </p>
  )
}

// Adds `qty` of a variant to the shared catalogue cart on top of what's
// already there, capped at the variant's stock. Returns how many actually
// went in (less than `qty` when the cap was hit).
export function addVariantToCart(variant, qty) {
  const before = getCatalogueCart()[variant.id] || 0
  const after = addToCatalogueCart(variant.id, qty, variant.maxQuantity)[variant.id] || 0
  return after - before
}

export function plural(n, word) {
  return `${n} ${word}${n > 1 ? 's' : ''}`
}

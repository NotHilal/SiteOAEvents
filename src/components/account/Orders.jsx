import { useEffect, useState } from 'react'
import Link from 'next/link'
import Icon from '../Icon.jsx'
import { orderPhase, orderPeriod, orderSteps } from '../../lib/order-status.js'
import { getCatalogueCart, setCatalogueCart, openCartDrawer } from '../../lib/cart.js'

// Building blocks of Mon compte > Mes commandes (pages/mon-compte/commandes).

export const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
export const orderHref = order => `/mon-compte/commandes/${encodeURIComponent(order.reference)}`

// { orders, error } — orders is null while loading.
export function useCustomerOrders() {
  const [state, setState] = useState({ orders: null, error: '' })
  useEffect(() => {
    let active = true
    fetch('/api/account/orders', { credentials: 'same-origin' })
      .then(r => r.json().then(body => (r.ok ? body.data : Promise.reject(new Error(body.message)))))
      .then(orders => { if (active) setState({ orders, error: '' }) })
      .catch(err => { if (active) setState({ orders: [], error: err.message || 'Impossible de charger vos commandes.' }) })
    return () => { active = false }
  }, [])
  return state
}

export function OrderStatusBadge({ order }) {
  const phase = orderPhase(order)
  return <span className={`oa-order-badge is-${phase.tone}`}>{phase.label}</span>
}

function Thumb({ item }) {
  return (
    <span className="oa-order-thumb">
      {item.image ? <img src={item.image} alt="" loading="lazy" /> : <Icon name="package" size={20} strokeWidth={1.4} />}
    </span>
  )
}

export function OrderRow({ order }) {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0)
  return (
    <Link href={orderHref(order)} className="oa-order-row">
      <span className="oa-order-thumbs" aria-hidden="true">
        {order.items.slice(0, 3).map(item => <Thumb key={item.id} item={item} />)}
        {order.items.length > 3 && <span className="oa-order-thumb is-more">+{order.items.length - 3}</span>}
      </span>
      <span className="oa-order-row-main">
        <span className="oa-order-row-top">
          <strong>Commande {order.reference}</strong>
          <OrderStatusBadge order={order} />
        </span>
        <span className="oa-order-row-meta">
          <span><Icon name="calendar" size={15} strokeWidth={1.5} />{orderPeriod(order.dates)}</span>
          <span>{count} article{count > 1 ? 's' : ''}</span>
        </span>
      </span>
      <span className="oa-order-row-total">{order.grand_total != null ? euro.format(order.grand_total) : '—'}</span>
      <span className="oa-account-action-arrow" aria-hidden="true">→</span>
    </Link>
  )
}

export function OrderTimeline({ order }) {
  const steps = orderSteps(order)
  if (!steps) return null
  return (
    <ol className="oa-order-timeline">
      {steps.map(step => (
        <li key={step.label} className={step.done ? 'is-done' : step.current ? 'is-current' : ''}>
          <span className="oa-order-timeline-dot" aria-hidden="true">{step.done && <Icon name="check" size={13} strokeWidth={2.4} />}</span>
          <span className="oa-order-timeline-copy">
            <strong>{step.label}</strong>
            <span>{step.detail}</span>
          </span>
          <span className="visually-hidden">{step.done ? ' — terminé' : step.current ? ' — en cours' : ' — à venir'}</span>
        </li>
      ))}
    </ol>
  )
}

// Puts the order's articles back in the cart (same quantities) and opens
// the cart drawer; dates are chosen again at checkout.
export function ReorderButton({ order, className = 'oa-account-primary-link' }) {
  const [done, setDone] = useState(false)
  function reorder() {
    const cart = { ...getCatalogueCart() }
    for (const item of order.items) cart[item.id] = item.quantity
    setCatalogueCart(cart)
    setDone(true)
    openCartDrawer()
  }
  return (
    <button type="button" className={`${className} oa-account-submit`} onClick={reorder}>
      <Icon name="reorder" size={16} strokeWidth={1.8} />
      {done ? 'Ajouté au panier' : 'Commander à nouveau'}
    </button>
  )
}

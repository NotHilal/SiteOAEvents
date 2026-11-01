import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Icon from '../../../src/components/Icon.jsx'
import Seo from '../../../src/components/Seo.jsx'
import AccountLayout, { AccountSection } from '../../../src/components/AccountLayout.jsx'
import { OrderStatusBadge, OrderTimeline, ReorderButton, euro } from '../../../src/components/account/Orders.jsx'
import { formatOrderDate, orderPeriod } from '../../../src/lib/order-status.js'

// What the customer should know at each status, in one line.
const STATUS_NOTE = {
  awaiting_payment: 'Le paiement de cette commande n’est pas finalisé. S’il n’aboutit pas dans les 30 minutes, le matériel est libéré et rien n’est débité.',
  cancelled: 'Commande annulée. Le montant payé a été remboursé sur votre moyen de paiement (5 à 10 jours ouvrés selon votre banque).',
  refused: 'Cette commande n’a pas pu être honorée. Contactez-nous pour trouver d’autres dates.',
}

function OrderDetail({ reference }) {
  const [state, setState] = useState({ order: null, error: '' })
  useEffect(() => {
    let active = true
    fetch(`/api/account/orders/${encodeURIComponent(reference)}`, { credentials: 'same-origin' })
      .then(r => r.json().then(body => (r.ok ? body.data : Promise.reject(new Error(body.message)))))
      .then(order => { if (active) setState({ order, error: '' }) })
      .catch(err => { if (active) setState({ order: null, error: err.message || 'Commande introuvable.' }) })
    return () => { active = false }
  }, [reference])

  const { order, error } = state
  if (error) {
    return (
      <AccountSection className="oa-account-empty-state">
        <h2>Commande introuvable</h2>
        <p>{error}</p>
        <Link href="/mon-compte/commandes" className="oa-account-primary-link">Mes commandes <span aria-hidden="true">→</span></Link>
      </AccountSection>
    )
  }
  if (!order) return <p className="oa-account-muted" role="status"><i className="fas fa-circle-notch fa-spin" /> Chargement de la commande…</p>

  const note = STATUS_NOTE[order.status]
  return (
    <>
      <div className="oa-order-detail-head">
        <div>
          <OrderStatusBadge order={order} />
          <p>Passée le {formatOrderDate(order.created_at.slice(0, 10))} · {orderPeriod(order.dates)}</p>
        </div>
        <ReorderButton order={order} />
      </div>

      {note && <p className="oa-order-note">{note}</p>}

      <AccountSection title="Suivi">
        {order.status === 'confirmed' || order.status === 'terminee' ? (
          <>
            <OrderTimeline order={order} />
            <p className="oa-account-note">Nous vous contactons avant la livraison et avant la reprise du matériel pour convenir des horaires.</p>
          </>
        ) : <p className="oa-account-muted">Aucune livraison n’est prévue pour cette commande.</p>}
      </AccountSection>

      <AccountSection title="Articles">
        <ul className="oa-order-items">
          {order.items.map(item => (
            <li key={item.id}>
              <span className="oa-order-thumb is-lg">
                {item.image ? <img src={item.image} alt="" loading="lazy" /> : <Icon name="package" size={22} strokeWidth={1.4} />}
              </span>
              <span className="oa-order-item-name">
                {item.slug ? <Link href={`/catalogue/${item.slug}`}>{item.name}</Link> : item.name}
                <small>{item.quantity} × {item.price != null ? euro.format(item.price) : '—'}</small>
              </span>
              <span className="oa-order-item-total">{item.price != null ? euro.format(item.price * item.quantity) : '—'}</span>
            </li>
          ))}
        </ul>
        <dl className="oa-order-totals">
          {order.materials_total != null && <div><dt>Sous-total</dt><dd>{euro.format(order.materials_total)}</dd></div>}
          {order.delivery_fee != null && <div><dt>Livraison et installation</dt><dd>{euro.format(order.delivery_fee)}</dd></div>}
          {order.grand_total != null && <div className="is-total"><dt>{['confirmed', 'terminee'].includes(order.status) ? 'Total payé' : 'Total'}</dt><dd>{euro.format(order.grand_total)}</dd></div>}
        </dl>
      </AccountSection>

      <AccountSection title="Livraison">
        <div className="oa-order-info-grid">
          <div>
            <span className="oa-order-info-label"><Icon name="truck" size={16} strokeWidth={1.5} /> Adresse</span>
            <p>{order.delivery_address || '—'}</p>
          </div>
          <div>
            <span className="oa-order-info-label"><Icon name="person" size={16} strokeWidth={1.5} /> Contact sur place</span>
            <p>{[order.contact.prenom, order.contact.nom].filter(Boolean).join(' ')}<br />{order.contact.phone}<br />{order.contact.email}</p>
          </div>
          {order.message && (
            <div className="oa-order-info-wide">
              <span className="oa-order-info-label"><Icon name="mail" size={16} strokeWidth={1.5} /> Vos précisions</span>
              <p>{order.message}</p>
            </div>
          )}
        </div>
      </AccountSection>

      <div className="oa-order-help">
        <Icon name="headset" size={22} strokeWidth={1.4} />
        <p>Une question sur cette commande, un changement d’horaire ? <Link href="/contact">Contactez-nous</Link> en indiquant le numéro <strong>{order.reference}</strong>.</p>
      </div>
    </>
  )
}

export default function CommandeDetail() {
  const router = useRouter()
  const reference = typeof router.query.reference === 'string' ? router.query.reference : ''
  return (
    <>
      <Seo title={`Commande ${reference}`} description="Détail et suivi de votre commande OA Événementiel." path="/mon-compte/commandes" noindex />
      <AccountLayout title={`Commande ${reference}`} parent={{ href: '/mon-compte/commandes', label: 'Mes commandes' }}>
        {router.isReady && reference && <OrderDetail reference={reference} />}
      </AccountLayout>
    </>
  )
}

import Link from 'next/link'
import Seo from '../../src/components/Seo.jsx'
import Icon from '../../src/components/Icon.jsx'
import AccountLayout, { AccountSection } from '../../src/components/AccountLayout.jsx'
import { OrderRow, OrderStatusBadge, OrderTimeline, orderHref, useCustomerOrders } from '../../src/components/account/Orders.jsx'
import { orderPhase, orderPeriod } from '../../src/lib/order-status.js'

const ACCOUNT_ACTIONS = [
  {
    href: '/mon-compte/commandes',
    icon: 'package',
    title: 'Mes commandes',
    text: 'Suivez vos livraisons, retrouvez le détail de vos commandes et commandez à nouveau.',
  },
  {
    href: '/mon-compte/informations',
    icon: 'person',
    title: 'Informations du compte',
    text: 'Vos coordonnées, pré-remplies à chaque commande.',
  },
  {
    href: '/catalogue/complet',
    icon: 'book',
    title: 'Catalogue',
    text: 'Mobilier, décoration et art de la table à louer, livrés, installés et repris chez vous.',
  },
]

// The order to put forward: the next delivery or rental in progress.
const upcoming = orders => orders
  .filter(order => ['confirmed', 'rented'].includes(orderPhase(order).key))
  .sort((a, b) => a.dates[0].localeCompare(b.dates[0]))[0]

function Dashboard({ user }) {
  const { orders, error } = useCustomerOrders()
  const next = orders && upcoming(orders)
  const recent = orders?.slice(0, 3) || []

  return (
    <>
      <AccountSection className="oa-account-welcome">
        <div>
          <span className="oa-account-kicker">Espace client</span>
          <h2>Bonjour {user?.firstName}</h2>
          <p>Commandez en ligne, nous livrons et installons le matériel, puis le reprenons après votre événement.</p>
        </div>
        <Link href="/catalogue/complet" className="oa-account-primary-link">
          Commander <span aria-hidden="true">→</span>
        </Link>
      </AccountSection>

      {next && (
        <AccountSection title="Commande en cours">
          <div className="oa-order-card">
            <div className="oa-order-card-head">
              <div>
                <strong>Commande {next.reference}</strong>
                <span>{orderPeriod(next.dates)}</span>
              </div>
              <OrderStatusBadge order={next} />
            </div>
            <OrderTimeline order={next} />
            <Link href={orderHref(next)} className="oa-order-card-link">Voir le détail <span aria-hidden="true">→</span></Link>
          </div>
        </AccountSection>
      )}

      <AccountSection title="Dernières commandes">
        {orders === null ? (
          <p className="oa-account-muted" role="status"><i className="fas fa-circle-notch fa-spin" /> Chargement de vos commandes…</p>
        ) : error ? (
          <p className="oa-account-form-error" role="alert">{error}</p>
        ) : recent.length ? (
          <>
            <div className="oa-order-list">{recent.map(order => <OrderRow key={order.reference} order={order} />)}</div>
            {orders.length > recent.length && (
              <Link href="/mon-compte/commandes" className="oa-account-text-link">Toutes mes commandes ({orders.length}) <span aria-hidden="true">→</span></Link>
            )}
          </>
        ) : (
          <p className="oa-account-muted">Vous n’avez pas encore passé de commande. Ajoutez des articles au panier depuis le catalogue, choisissez vos dates et réglez en ligne.</p>
        )}
      </AccountSection>

      <AccountSection title="Accès rapides">
        <div className="oa-account-action-list">
          {ACCOUNT_ACTIONS.map(action => (
            <Link key={action.href} href={action.href} className="oa-account-action">
              <span className="oa-account-action-icon"><Icon name={action.icon} size={22} strokeWidth={1.35} /></span>
              <span className="oa-account-action-copy">
                <strong>{action.title}</strong>
                <span>{action.text}</span>
              </span>
              <span className="oa-account-action-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </AccountSection>
    </>
  )
}

export default function MonCompte() {
  return (
    <>
      <Seo
        title="Mon compte"
        description="Suivez vos commandes de location OA Événementiel et gérez votre compte."
        path="/mon-compte"
        noindex
      />
      <AccountLayout
        title="Tableau de bord"
        description="Vos commandes, leur livraison et vos informations, au même endroit."
      >
        {user => <Dashboard user={user} />}
      </AccountLayout>
    </>
  )
}

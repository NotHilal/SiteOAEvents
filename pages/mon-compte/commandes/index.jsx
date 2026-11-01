import Link from 'next/link'
import Icon from '../../../src/components/Icon.jsx'
import Seo from '../../../src/components/Seo.jsx'
import AccountLayout, { AccountSection } from '../../../src/components/AccountLayout.jsx'
import { OrderRow, useCustomerOrders } from '../../../src/components/account/Orders.jsx'
import { orderPhase } from '../../../src/lib/order-status.js'

const IN_PROGRESS = ['awaiting_payment', 'confirmed', 'rented']

function Orders() {
  const { orders, error } = useCustomerOrders()
  if (orders === null) return <p className="oa-account-muted" role="status"><i className="fas fa-circle-notch fa-spin" /> Chargement de vos commandes…</p>
  if (error) return <p className="oa-account-form-error" role="alert">{error}</p>

  if (!orders.length) {
    return (
      <AccountSection className="oa-account-empty-state">
        <span className="oa-account-empty-icon"><Icon name="package" size={30} strokeWidth={1.25} /></span>
        <h2>Aucune commande pour le moment</h2>
        <p>Ajoutez des articles au panier depuis le catalogue, choisissez vos dates et réglez en ligne : votre commande apparaîtra ici avec son suivi de livraison.</p>
        <Link href="/catalogue/complet" className="oa-account-primary-link">Voir le catalogue <span aria-hidden="true">→</span></Link>
      </AccountSection>
    )
  }

  const current = orders.filter(order => IN_PROGRESS.includes(orderPhase(order).key))
  const past = orders.filter(order => !IN_PROGRESS.includes(orderPhase(order).key))
  return (
    <>
      {current.length > 0 && (
        <AccountSection title="En cours">
          <div className="oa-order-list">{current.map(order => <OrderRow key={order.reference} order={order} />)}</div>
        </AccountSection>
      )}
      {past.length > 0 && (
        <AccountSection title="Historique">
          <div className="oa-order-list">{past.map(order => <OrderRow key={order.reference} order={order} />)}</div>
        </AccountSection>
      )}
      <p className="oa-account-note">
        Une commande passée sans être connecté n’apparaît pas ici : retrouvez-la avec son numéro sur la page <Link href="/suivi">Suivi de commande</Link>.
      </p>
    </>
  )
}

export default function MesCommandes() {
  return (
    <>
      <Seo title="Mes commandes" description="Suivez vos commandes de location OA Événementiel." path="/mon-compte/commandes" noindex />
      <AccountLayout title="Mes commandes" description="Livraison, location et reprise du matériel : suivez chaque commande étape par étape.">
        <Orders />
      </AccountLayout>
    </>
  )
}

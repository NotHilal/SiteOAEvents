import { useEffect } from 'react'
import Link from 'next/link'
import Seo from '../../src/components/Seo.jsx'
import { clearCatalogueCart, setCartDates } from '../../src/lib/cart.js'

// Where the customer lands after paying — directly (card) or back from
// Stripe (PayPal, 3-D Secure), with ?payment_intent=…&payment_intent_client_secret=….
// The PaymentIntent is re-read from Stripe here, so the order is confirmed
// even before the webhook arrives. The client secret proves the visitor is
// the one who paid; without it nothing is shown.
export async function getServerSideProps({ query, res }) {
  res.setHeader('Cache-Control', 'no-store')
  const { default: db } = await import('../../src/lib/sqlite-db.js')
  const { getStripe, isStripeConfigured } = await import('../../src/lib/stripe.js')
  const { recordPaymentSuccess } = await import('../../src/lib/orders.js')
  const intentId = typeof query.payment_intent === 'string' ? query.payment_intent : ''
  const secret = typeof query.payment_intent_client_secret === 'string' ? query.payment_intent_client_secret : ''
  if (!/^pi_[A-Za-z0-9_]+$/.test(intentId) || !secret || !isStripeConfigured()) return { notFound: true }

  const payment = await db.prepare('SELECT reservation_id FROM payments WHERE stripe_payment_intent_id = ?').get(intentId)
  if (!payment) return { notFound: true }
  let intent
  try { intent = await getStripe().paymentIntents.retrieve(intentId) } catch { return { notFound: true } }
  if (intent.client_secret !== secret) return { notFound: true }
  if (intent.status === 'succeeded') {
    try { await recordPaymentSuccess(intent) } catch (error) { console.error('[confirmation]', error.message) }
  }

  const order = await db.prepare('SELECT * FROM reservations WHERE id = ?').get(payment.reservation_id)
  const parse = v => { try { return JSON.parse(v || '[]') } catch { return [] } }
  const dates = parse(order.dates)
  return {
    props: {
      state: intent.status === 'succeeded' ? 'paid' : intent.status === 'processing' ? 'processing' : 'failed',
      order: {
        reference: order.reference,
        prenom: order.prenom || '',
        email: order.email,
        dates: dates.length ? dates : [order.date],
        items: parse(order.materials).map(m => ({ name: m.name, quantity: m.quantity, price: m.price })),
        delivery: order.delivery_fee || 0,
        address: order.delivery_address || '',
        total: order.grand_total,
      },
    },
  }
}

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const fmt = ds => new Date(ds + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export default function Confirmation({ state, order }) {
  useEffect(() => {
    if (state === 'failed') return
    clearCatalogueCart()
    setCartDates([])
    try { sessionStorage.removeItem('oa_checkout_attempt') } catch {}
  }, [state])

  const period = order.dates.length > 1 ? `Du ${fmt(order.dates[0])} au ${fmt(order.dates[order.dates.length - 1])}` : fmt(order.dates[0])

  return (
    <>
      <Seo title={state === 'failed' ? 'Paiement non abouti' : 'Commande confirmée'} description="Confirmation de votre commande OA Événementiel." path="/commande/confirmation" noindex />
      <div className="site-wrap ck-page">
        <div className="oa-container ck-confirm">
          {state === 'failed' ? (
            <div className="ck-confirm-head is-failed">
              <span className="ck-confirm-icon"><i className="fas fa-times" /></span>
              <h1>Le paiement n’a pas abouti</h1>
              <p>Aucun montant n’a été débité. Votre panier est conservé : vous pouvez réessayer avec le même moyen de paiement ou un autre.</p>
              <Link href="/commande" className="shop-btn shop-btn-gold shop-btn-xl">Revenir au paiement</Link>
            </div>
          ) : (
            <div className="ck-confirm-head">
              <span className="ck-confirm-icon"><i className="fas fa-check" /></span>
              <h1>{state === 'paid' ? `Merci${order.prenom ? ` ${order.prenom}` : ''}, votre commande est confirmée` : 'Paiement en cours de validation'}</h1>
              <p>
                {state === 'paid'
                  ? <>Un email de confirmation est envoyé à <strong>{order.email}</strong>. Nous vous contacterons avant l’événement pour l’horaire de livraison.</>
                  : <>Votre banque confirme le paiement ; cela prend en général quelques minutes. Vous recevrez un email à <strong>{order.email}</strong> dès qu’il est validé.</>}
              </p>
              <p className="ck-confirm-ref">Commande <strong>{order.reference}</strong></p>
            </div>
          )}

          <div className="ck-confirm-card">
            <div className="ck-confirm-row"><i className="far fa-calendar" /><div><span className="ck-label">Date</span>{period}</div></div>
            {order.address && <div className="ck-confirm-row"><i className="fas fa-truck" /><div><span className="ck-label">Livraison</span>{order.address}</div></div>}
            <ul className="ck-confirm-items">
              {order.items.map((item, i) => (
                <li key={i}><span>{item.name} <small>× {item.quantity}</small></span><span>{euro.format(item.price * item.quantity)}</span></li>
              ))}
              <li><span>Livraison et installation</span><span>{euro.format(order.delivery)}</span></li>
              <li className="ck-total"><span>{state === 'failed' ? 'Total' : 'Total payé'}</span><span>{euro.format(order.total)}</span></li>
            </ul>
          </div>

          {state !== 'failed' && (
            <div className="ck-confirm-actions">
              <Link href="/suivi" className="shop-btn shop-btn-dark">Suivre ma commande</Link>
              <Link href="/catalogue/complet" className="shop-btn shop-btn-ghost">Continuer mes achats</Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import PaymentFlow from '../src/components/PaymentFlow.jsx'

const EVENT_LABELS = {
  'mariage':'Mariage','anniversaire':'Anniversaire',
  'evenement-pro':'Événement professionnel',
  'location-deco':'Location décoration','autre':'Autre'
}
const STATUS_LABEL = { pending:'En attente', awaiting_payment:'En attente de paiement', confirmed:'Confirmée', terminee:'Terminée', refused:'Refusée' }
const STATUS_CLASS = { pending:'badge-pending', awaiting_payment:'badge-awaiting', confirmed:'badge-confirmed', terminee:'badge-terminee', refused:'badge-refused' }

function fmtDate(ds) {
  return new Date(ds + 'T12:00:00').toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })
}

export default function Suivi() {
  const [email, setEmail] = useState('')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)
  const [paidJustNow, setPaidJustNow] = useState(null)
  const [showPriceDetail, setShowPriceDetail] = useState(false)

  // Re-run the last successful lookup on reload so the visitor doesn't have
  // to retype their email + numéro de commande every time — sessionStorage
  // (not localStorage) so it clears itself once the tab is closed.
  useEffect(() => {
    const savedEmail = sessionStorage.getItem('oa_suivi_email')
    const savedRef = sessionStorage.getItem('oa_suivi_reference')
    if (savedEmail && savedRef) {
      setEmail(savedEmail)
      setReference(savedRef)
      runSearch(savedEmail, savedRef)
    }
  }, [])

  // Freeze the page behind the modal — see the same lock in espace-oa.jsx.
  // html carries an explicit overflow-x (style.css) which stops body's
  // overflow from propagating to the viewport, so html needs locking too.
  useEffect(() => {
    document.documentElement.style.overflowY = showPriceDetail ? 'hidden' : ''
    document.body.style.overflow = showPriceDetail ? 'hidden' : ''
    return () => { document.documentElement.style.overflowY = ''; document.body.style.overflow = '' }
  }, [showPriceDetail])

  async function runSearch(emailVal, referenceVal) {
    setLoading(true)
    setError('')
    setOrder(null)
    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal.trim(), reference: referenceVal.trim() }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.message || 'Erreur de recherche')
      setOrder(result.data)
      sessionStorage.setItem('oa_suivi_email', emailVal.trim())
      sessionStorage.setItem('oa_suivi_reference', referenceVal.trim())
    } catch (err) {
      setError(err.message)
      sessionStorage.removeItem('oa_suivi_email')
      sessionStorage.removeItem('oa_suivi_reference')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    runSearch(email, reference)
  }

  function handleNewSearch() {
    setOrder(null)
    setPaidJustNow(null)
    sessionStorage.removeItem('oa_suivi_email')
    sessionStorage.removeItem('oa_suivi_reference')
  }

  function handlePaymentComplete(summary) {
    setPaidJustNow(summary)
    // Re-fetch so the schedule/fullyPaid state reflects what was just paid.
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), reference: reference.trim() }),
    }).then(r => r.json()).then(result => { if (result.data) setOrder(result.data) }).catch(() => {})
  }

  return (
    <>
      <Head>
        <title>Suivi de commande — OA Événementiel</title>
        <meta name="description" content="Consultez les informations de votre demande ou commande d'événement : statut, détails et paiement en ligne." />
      </Head>

      <div className="site-wrap">
        <div
          className="page-header"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1920&q=80)' }}
        >
          <div className="page-header-overlay" />
          <div className="container">
            <h1>Suivi de commande</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb justify-content-center">
                <li className="breadcrumb-item"><Link href="/">Accueil</Link></li>
                <li className="breadcrumb-item active">Suivi de commande</li>
              </ol>
            </nav>
          </div>
        </div>

        <section className="resa-section">
          <div className="container" style={{maxWidth:640}}>
            {!order && (
              <form onSubmit={handleSearch}>
                <p className="step-desc" style={{marginBottom:24}}>
                  Entrez l'email utilisé lors de votre demande et le numéro de commande reçu par email pour consulter son statut et régler votre paiement.
                </p>
                <div className="form-group">
                  <label>Email <span className="req">*</span></label>
                  <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Numéro de commande <span className="req">*</span></label>
                  <input className="form-control" placeholder="OA-XXXXXX" value={reference} onChange={e => setReference(e.target.value.toUpperCase())} required />
                </div>
                {error && (
                  <div className="resa-alert mt-3"><i className="fas fa-exclamation-circle" />{error}</div>
                )}
                <button type="submit" className="btn btn-rose-gold step-next-btn mt-3" disabled={loading}>
                  {loading ? <><i className="fas fa-circle-notch fa-spin me-1" />Recherche…</> : <>Rechercher <i className="fas fa-search ms-1" /></>}
                </button>
              </form>
            )}

            {order && (
              <div>
                <button className="step-prev-btn mb-3" onClick={handleNewSearch}>
                  <i className="fas fa-arrow-left me-1" />Nouvelle recherche
                </button>

                <div className="recap-card">
                  <div className="recap-row">
                    <span className="recap-lbl"><i className="fas fa-hashtag" />Commande</span>
                    <span className="recap-val"><strong>{order.reference}</strong></span>
                  </div>
                  <div className="recap-row">
                    <span className="recap-lbl"><i className="fas fa-flag" />Statut</span>
                    <span className="recap-val"><span className={`status-badge ${STATUS_CLASS[order.status]||''}`}>{STATUS_LABEL[order.status]||order.status}</span></span>
                  </div>
                  <div className="recap-row">
                    <span className="recap-lbl"><i className="fas fa-calendar" />Date(s)</span>
                    <span className="recap-val">{order.dates.map(fmtDate).join(' · ')}</span>
                  </div>
                  <div className="recap-row">
                    <span className="recap-lbl"><i className="fas fa-tag" />Événement</span>
                    <span className="recap-val">{EVENT_LABELS[order.event_type] || order.event_type || '—'}</span>
                  </div>
                  {order.nb_persons && (
                    <div className="recap-row">
                      <span className="recap-lbl"><i className="fas fa-users" />Personnes</span>
                      <span className="recap-val">{order.nb_persons}</span>
                    </div>
                  )}
                  {order.materials?.length > 0 && (
                    <div className="recap-row">
                      <span className="recap-lbl"><i className="fas fa-boxes" />Matériaux</span>
                      <span className="recap-val">{order.materials.map(m => m.name + ' × ' + m.quantity).join(', ')}</span>
                    </div>
                  )}
                  {order.grand_total != null && (
                    <div className="recap-row">
                      <span className="recap-lbl"><i className="fas fa-euro-sign" />Total estimé</span>
                      <span className="recap-val"><strong>{order.grand_total.toFixed(2)} €</strong></span>
                    </div>
                  )}
                </div>

                <button className="step-prev-btn mt-3" onClick={() => setShowPriceDetail(true)}>
                  <i className="fas fa-receipt me-1" />Voir le détail des prix
                </button>

                {order.status === 'pending' && (
                  <div className="resa-alert mt-3" style={{background:'#fffbeb',color:'#92400e',borderColor:'#fcd34d'}}>
                    <i className="fas fa-clock" />Votre demande est en attente de confirmation. Vous recevrez un email dès qu'elle sera traitée.
                  </div>
                )}

                {order.status === 'refused' && (
                  <div className="resa-alert mt-3">
                    <i className="fas fa-exclamation-circle" />Cette demande n'a malheureusement pas pu être acceptée. N'hésitez pas à nous contacter pour explorer d'autres dates.
                  </div>
                )}

                {order.status === 'awaiting_payment' && (
                  <div className="mt-4">
                    {paidJustNow ? (
                      <div className="resa-success-msg" style={{padding:'32px 16px'}}>
                        <span className="success-icon"><i className="fas fa-check-circle" /></span>
                        <h3>Merci !</h3>
                        <p>
                          {paidJustNow.method === 'card'
                            ? `Votre versement de ${paidJustNow.firstAmount?.toFixed(2)} € a bien été réglé.`
                            : `Votre virement de ${paidJustNow.firstAmount?.toFixed(2)} € est noté — nous le confirmerons dès réception.`}
                        </p>
                      </div>
                    ) : order.fullyPaid ? (
                      <div className="resa-alert" style={{background:'#f0fdf4',color:'#166534',borderColor:'#86efac'}}>
                        <i className="fas fa-check-circle" />Tous les versements ont été reçus — votre réservation sera définitivement confirmée sous peu.
                      </div>
                    ) : (
                      <>
                        <h4 className="res-quote-title" style={{marginBottom:16}}><i className="fas fa-credit-card" style={{marginRight:8}} />Paiement</h4>
                        <PaymentFlow reservationId={order.id} grandTotal={order.grand_total || 0} onComplete={handlePaymentComplete} />
                      </>
                    )}
                  </div>
                )}

                {order.status === 'confirmed' && (
                  <div className="resa-alert mt-4" style={{background:'#f0fdf4',color:'#166534',borderColor:'#86efac'}}>
                    <i className="fas fa-check-circle" />Réservation définitivement confirmée et réglée — à très bientôt !
                  </div>
                )}

                {order.status === 'terminee' && (
                  <div className="resa-alert mt-4" style={{background:'#f0fdf4',color:'#166534',borderColor:'#86efac'}}>
                    <i className="fas fa-check-circle" />Événement terminé — merci d'avoir fait confiance à OA Événementiel !
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {showPriceDetail && order && (
          <div className="modal-overlay" style={{display:'flex'}} onClick={e => { if (e.target === e.currentTarget) setShowPriceDetail(false) }}>
            <div className="modal-card detail-modal-card">
              <button className="modal-close" onClick={() => setShowPriceDetail(false)}><i className="fas fa-times" /></button>
              <h3 className="day-modal-title"><i className="fas fa-receipt" style={{marginRight:10,color:'var(--rose-gold)'}} />Détail du prix</h3>
              <div className="price-detail-card">
                {order.materials?.length > 0 ? order.materials.map((m, i) => (
                  <div key={i} className="price-detail-row">
                    <span className="price-detail-label">
                      <i className="fas fa-box" style={{marginRight:8,color:'var(--rose-gold)'}} />{m.name} × {m.quantity}
                      {m.price != null && <span className="price-detail-sub">{m.price.toFixed(2)} €/unité</span>}
                    </span>
                    {m.price != null && <span className="price-detail-amount">{(m.price * m.quantity).toFixed(2)} €</span>}
                  </div>
                )) : (
                  <div className="price-detail-row"><span className="price-detail-label">Aucun matériel sélectionné</span></div>
                )}
                {order.materials_total != null && order.materials?.length > 0 && (
                  <div className="price-detail-row">
                    <span className="price-detail-label"><strong>Sous-total matériaux</strong></span>
                    <span className="price-detail-amount">{order.materials_total.toFixed(2)} €</span>
                  </div>
                )}
                {order.delivery_address && (
                  <>
                    <div className="price-detail-row">
                      <span className="price-detail-label">
                        <i className="fas fa-map-marker-alt" style={{marginRight:8,color:'var(--rose-gold)'}} />Livraison
                        <span className="price-detail-sub">{order.delivery_address}{order.distance_km!=null?` — ${order.distance_km} km`:''}</span>
                      </span>
                    </div>
                    {order.quote_base_fee != null && (
                      <div className="price-detail-row">
                        <span className="price-detail-label">Frais de base</span>
                        <span className="price-detail-amount">{order.quote_base_fee.toFixed(2)} €</span>
                      </div>
                    )}
                    {order.quote_per_km != null && order.distance_km != null && (
                      <div className="price-detail-row">
                        <span className="price-detail-label">Frais kilométrique<span className="price-detail-sub">{order.quote_per_km.toFixed(2)} €/km × {order.distance_km} km</span></span>
                        <span className="price-detail-amount">{(order.quote_per_km * order.distance_km).toFixed(2)} €</span>
                      </div>
                    )}
                    {order.delivery_fee != null && (
                      <div className="price-detail-row">
                        <span className="price-detail-label"><strong>Total livraison</strong></span>
                        <span className="price-detail-amount">{order.delivery_fee.toFixed(2)} €</span>
                      </div>
                    )}
                  </>
                )}
                {order.grand_total != null && (
                  <div className="price-detail-row price-detail-total">
                    <span className="price-detail-label">Total estimé</span>
                    <span className="price-detail-amount">{order.grand_total.toFixed(2)} €</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

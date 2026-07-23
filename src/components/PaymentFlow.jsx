import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import CardPaymentForm from './CardPaymentForm.jsx'

// NEXT_PUBLIC_* vars are inlined at build time. Stays null (no crash) until
// an admin adds a real Stripe publishable key to .env.
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

// Payment step for an already-confirmed reservation — used by /suivi once a
// client looks up a request that's been accepted. Originally lived inline in
// the reservation wizard, but payment now happens only after confirmation
// (asking for money before the admin has even confirmed availability is a
// bad experience if the request then gets refused), so this is a standalone,
// reusable piece driven only by `reservationId` + `grandTotal`.
const TIER_LABELS = { 1: 'En 1 fois', 2: 'En 2 fois', 3: 'En 3 fois', 4: 'En 4 fois' }

export default function PaymentFlow({ reservationId, grandTotal, onComplete }) {
  const [methodsAvail, setMethodsAvail] = useState({ card: false, virement: false })
  const [tiersInfo, setTiersInfo] = useState({ 2: { eligible: true, reason: null }, 3: { eligible: true, reason: null }, 4: { eligible: true, reason: null } })
  const [phase, setPhase] = useState('choose') // choose | plan-choice | card | bank
  const [pendingMethod, setPendingMethod] = useState(null) // 'card' | 'virement', set while on plan-choice
  const [schedule, setSchedule] = useState([])
  const [initError, setInitError] = useState('')
  const [initLoading, setInitLoading] = useState(false)
  const [clientSecret, setClientSecret] = useState(null)
  const [billingDetails, setBillingDetails] = useState(null)
  const [bankInfo, setBankInfo] = useState(null)

  useEffect(() => {
    fetch('/api/payments/methods?reservationId=' + encodeURIComponent(reservationId)).then(r => r.json()).then(res => {
      if (res.data) {
        setMethodsAvail(res.data)
        if (res.data.installmentTiers) setTiersInfo(res.data.installmentTiers)
      }
    }).catch(() => {})
  }, [reservationId])

  // Every non-"choose" phase's back button returns straight to "choose"
  // rather than stepping back one phase at a time — once a PaymentIntent
  // exists (card-plan → card), re-visiting card-plan wouldn't actually let
  // the client switch plans anyway (create-intent returns the same
  // already-created schedule), so there's nothing useful to go "back" to
  // in between.
  function backToChoose() {
    setInitError('')
    setPhase('choose')
  }

  async function chooseCardPlan(tier) {
    setInitLoading(true)
    setInitError('')
    try {
      const res = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, plan: tier }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.message || 'Erreur lors de la préparation du paiement')
      setClientSecret(result.data.clientSecret)
      setBillingDetails(result.data.billingDetails || null)
      setSchedule(result.data.schedule)
      setPhase('card')
    } catch (err) {
      setInitError(err.message)
    } finally {
      setInitLoading(false)
    }
  }

  async function chooseVirementPlan(tier) {
    setInitLoading(true)
    setInitError('')
    try {
      const res = await fetch('/api/payments/init-virement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, plan: tier }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.message || 'Erreur lors de la préparation du virement')
      setBankInfo(result.data.bank)
      setSchedule(result.data.schedule)
      setPhase('bank')
    } catch (err) {
      setInitError(err.message)
    } finally {
      setInitLoading(false)
    }
  }

  function choosePlan(tier) {
    if (pendingMethod === 'card') chooseCardPlan(tier)
    else chooseVirementPlan(tier)
  }

  function handleCardSuccess() {
    onComplete?.({ method: 'card', firstAmount: schedule[0]?.amount, count: schedule.length })
  }

  function finishVirement() {
    onComplete?.({ method: 'virement', firstAmount: schedule[0]?.amount, count: schedule.length })
  }

  if (!methodsAvail.card && !methodsAvail.virement) {
    return (
      <div className="resa-alert">
        <i className="fas fa-info-circle" />Le paiement en ligne n'est pas encore configuré — contactez-nous pour régler votre réservation.
      </div>
    )
  }

  return (
    <div>
      {phase === 'choose' && (
        <div>
          <div className="res-quote-box" style={{marginBottom:20}}>
            <div className="res-total-row res-total-grand">
              <span>Total à régler</span><strong>{grandTotal.toFixed(2)} €</strong>
            </div>
          </div>
          <div style={{display:'flex', gap:14, flexWrap:'wrap'}}>
            {methodsAvail.card && (
              <button className="btn btn-rose-gold" onClick={() => { setPendingMethod('card'); setPhase('plan-choice') }} disabled={initLoading}>
                <i className="fas fa-credit-card me-2" />Payer par carte
              </button>
            )}
            {methodsAvail.virement && (
              <button className="step-prev-btn" onClick={() => { setPendingMethod('virement'); setPhase('plan-choice') }} disabled={initLoading} style={{padding:'14px 38px'}}>
                <i className="fas fa-university me-2" />Payer par virement
              </button>
            )}
          </div>
          {initLoading && <p className="mt-3"><i className="fas fa-circle-notch fa-spin me-2" />Préparation du paiement…</p>}
          {initError && (
            <div className="resa-alert mt-3"><i className="fas fa-exclamation-circle" />{initError}</div>
          )}
        </div>
      )}

      {phase === 'plan-choice' && (
        <div>
          <p className="step-desc">Choisissez comment régler {pendingMethod === 'card' ? 'par carte' : 'par virement'}.</p>
          <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
            {[1, 2, 3, 4].map(tier => {
              const info = tier === 1 ? { eligible: true, reason: null } : tiersInfo[tier]
              const eligible = info?.eligible !== false
              return (
                <button
                  key={tier}
                  className={tier === 1 ? 'btn btn-rose-gold' : 'step-prev-btn'}
                  onClick={() => choosePlan(tier)}
                  disabled={initLoading || !eligible}
                  title={!eligible ? info?.reason : undefined}
                  style={tier === 1 ? undefined : {padding:'14px 26px'}}
                >
                  {tier === 1 ? <i className="fas fa-credit-card me-2" /> : <i className="fas fa-calendar-alt me-2" />}
                  {TIER_LABELS[tier]}
                </button>
              )
            })}
          </div>
          {[2, 3, 4].filter(tier => tiersInfo[tier]?.eligible === false).map(tier => (
            <p key={tier} className="mt-2" style={{fontSize:'.82rem', color:'var(--gray)'}}>
              <i className="fas fa-info-circle me-1" />{TIER_LABELS[tier]} : {tiersInfo[tier].reason}
            </p>
          ))}
          {initLoading && <p className="mt-3"><i className="fas fa-circle-notch fa-spin me-2" />Préparation du paiement…</p>}
          {initError && (
            <div className="resa-alert mt-3"><i className="fas fa-exclamation-circle" />{initError}</div>
          )}
          <button className="detail-back mt-3" onClick={backToChoose}><i className="fas fa-arrow-left me-1" />Retour</button>
        </div>
      )}

      {phase === 'card' && (
        <div>
          <p className="step-desc">
            {schedule.length > 1
              ? 'Réglez votre premier versement par carte bancaire — le reste sera prélevé automatiquement aux échéances ci-dessous.'
              : 'Réglez le montant total par carte bancaire.'}
          </p>
          <ScheduleList schedule={schedule} />
          <CardPaymentForm
            stripePromise={stripePromise}
            clientSecret={clientSecret}
            billingDetails={billingDetails}
            amount={schedule[0]?.amount || 0}
            onSuccess={handleCardSuccess}
          />
          <button className="detail-back mt-3" onClick={backToChoose}><i className="fas fa-arrow-left me-1" />Retour</button>
        </div>
      )}

      {phase === 'bank' && bankInfo && (
        <div>
          <p className="step-desc">Réglez par virement bancaire aux coordonnées ci-dessous, en respectant l'échéancier.</p>
          <div className="recap-card">
            {bankInfo.holder && (
              <div className="recap-row"><span className="recap-lbl"><i className="fas fa-user" />Titulaire</span><span className="recap-val">{bankInfo.holder}</span></div>
            )}
            <div className="recap-row"><span className="recap-lbl"><i className="fas fa-university" />IBAN</span><span className="recap-val">{bankInfo.iban}</span></div>
            {bankInfo.bic && (
              <div className="recap-row"><span className="recap-lbl"><i className="fas fa-hashtag" />BIC</span><span className="recap-val">{bankInfo.bic}</span></div>
            )}
          </div>
          <ScheduleList schedule={schedule} />
          <p className="resa-privacy">Chaque versement sera marqué comme reçu par notre équipe une fois le virement constaté sur notre compte.</p>
          <div className="step-nav">
            <button className="step-prev-btn" onClick={backToChoose}><i className="fas fa-arrow-left me-1" />Retour</button>
            <button className="btn btn-rose-gold step-next-btn" onClick={finishVirement}>
              J'ai noté <i className="fas fa-check ms-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ScheduleList({ schedule }) {
  if (!schedule?.length) return null
  return (
    <div className="recap-card" style={{marginBottom:20}}>
      <div className="recap-row" style={{borderBottom:'1px solid var(--border)'}}>
        <span className="recap-lbl"><i className="fas fa-calendar-alt" />Échéancier</span>
        <span className="recap-val">{schedule.length} versement{schedule.length>1?'s':''}</span>
      </div>
      {schedule.map(s => (
        <div key={s.index} className="recap-row">
          <span className="recap-lbl">
            {s.label}
            {s.dueDate && <> — {new Date(s.dueDate + 'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</>}
          </span>
          <span className="recap-val">{s.amount.toFixed(2)} €</span>
        </div>
      ))}
    </div>
  )
}

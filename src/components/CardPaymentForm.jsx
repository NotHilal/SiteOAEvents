import { useState } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

function InnerForm({ amount, billingDetails, onSuccess, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError('')
    // Required because the PaymentElement below is told never to collect
    // name/email/phone itself (see its comment) — Stripe rejects confirm
    // otherwise with "you opted out via fields but didn't supply it here".
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        payment_method_data: {
          billing_details: {
            name: billingDetails?.name || undefined,
            email: billingDetails?.email || undefined,
            phone: billingDetails?.phone || undefined,
          },
        },
      },
    })
    if (confirmError) {
      const msg = confirmError.message || 'Le paiement a échoué. Vérifiez vos informations de carte.'
      setError(msg)
      setSubmitting(false)
      onError?.(msg)
      return
    }
    if (paymentIntent?.status === 'succeeded') {
      onSuccess?.()
    } else {
      // requires_action/processing — rare for a first card payment, but
      // handled explicitly rather than silently treated as success.
      setError("Le paiement est en cours de traitement, veuillez patienter puis vérifier votre email.")
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Email/phone/name are already known — attached to the Stripe customer
          when the intent was created (see getOrCreateCustomer). Collecting
          them again here is what triggers Stripe's "Link" inline signup
          prompt (save your info for faster checkout); turning the fields
          off removes that panel and leaves just the card form. */}
      <PaymentElement options={{ fields: { billingDetails: { email: 'never', phone: 'never', name: 'never' } } }} />
      {error && (
        <div className="resa-alert mt-3">
          <i className="fas fa-exclamation-circle" />{error}
        </div>
      )}
      <button type="submit" className="btn btn-rose-gold step-next-btn mt-3" disabled={!stripe || submitting}>
        {submitting
          ? <><i className="fas fa-circle-notch fa-spin me-1" />Paiement en cours…</>
          : <>Payer {amount.toFixed(2)} € <i className="fas fa-lock ms-1" /></>
        }
      </button>
    </form>
  )
}

export default function CardPaymentForm({ stripePromise, clientSecret, billingDetails, amount, onSuccess, onError }) {
  if (!stripePromise || !clientSecret) return null
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, locale: 'fr' }}>
      <InnerForm amount={amount} billingDetails={billingDetails} onSuccess={onSuccess} onError={onError} />
    </Elements>
  )
}

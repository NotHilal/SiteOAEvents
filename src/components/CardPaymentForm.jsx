import { useState } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

function InnerForm({ amount, onSuccess, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError('')
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
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
      <PaymentElement />
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

export default function CardPaymentForm({ stripePromise, clientSecret, amount, onSuccess, onError }) {
  if (!stripePromise || !clientSecret) return null
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, locale: 'fr' }}>
      <InnerForm amount={amount} onSuccess={onSuccess} onError={onError} />
    </Elements>
  )
}

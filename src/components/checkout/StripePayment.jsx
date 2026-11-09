import { useState } from 'react'
// '/pure' does NOT inject stripe.js on import: Stripe's script (and its
// fraud-detection cookies) only loads on the checkout page.
import { loadStripe } from '@stripe/stripe-js/pure'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

// The publishable key comes from the server (GET /api/checkout), set in
// Espace OA > Réglages — not baked into the build.
let stripePromise = null
let stripeKey = null
function getStripePromise(key) {
  if (!key) return null
  if (!stripePromise || stripeKey !== key) { stripePromise = loadStripe(key); stripeKey = key }
  return stripePromise
}

const APPEARANCE = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#16140f',
    colorText: '#16140f',
    colorTextSecondary: '#6b6558',
    colorDanger: '#b3261e',
    fontFamily: 'Lato, system-ui, sans-serif',
    borderRadius: '2px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { borderColor: 'rgba(22, 20, 15, 0.18)', boxShadow: 'none' },
    '.Input:focus': { borderColor: '#c9a15a', boxShadow: '0 0 0 1px #c9a15a' },
    '.Tab': { borderColor: 'rgba(22, 20, 15, 0.18)', boxShadow: 'none' },
    '.Tab--selected': { borderColor: '#16140f', boxShadow: '0 0 0 1px #16140f' },
  },
}

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

// Deferred-intent Payment Element: the form shows before any order exists
// (every method switched on in the Stripe dashboard — card, Apple Pay,
// Google Pay, PayPal…). On "Payer", the order is created server-side
// (`createPayment`), then the payment is confirmed against it.
export default function StripePayment({ amount, publishableKey, ...props }) {
  const stripe = getStripePromise(publishableKey)
  if (!stripe) return null
  return (
    <Elements stripe={stripe} options={{ mode: 'payment', currency: 'eur', amount: Math.max(50, Math.round(amount * 100)), locale: 'fr', appearance: APPEARANCE }}>
      <PaymentForm amount={amount} {...props} />
    </Elements>
  )
}

function PaymentForm({ amount, ready, validate, createPayment, onPaid, billingDetails }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pay() {
    setError('')
    if (!validate()) return
    if (!stripe || !elements) return
    setBusy(true)
    try {
      const { error: formError } = await elements.submit()
      if (formError) throw formError
      const order = await createPayment()
      if (order.paid) return onPaid({ order })
      const { error: payError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: order.clientSecret,
        redirect: 'if_required',
        confirmParams: {
          // Redirect-based methods (PayPal, 3-D Secure on some cards) come
          // back here; Stripe appends the payment_intent parameters.
          return_url: `${window.location.origin}/commande/confirmation`,
          payment_method_data: { billing_details: billingDetails },
        },
      })
      if (payError) throw payError
      onPaid({ order, paymentIntent })
    } catch (err) {
      setError(err.message || 'Le paiement n’a pas abouti. Vérifiez vos informations et réessayez.')
      setBusy(false)
    }
  }

  return (
    <div className="ck-pay">
      <PaymentElement options={{
        layout: { type: 'accordion', defaultCollapsed: false, radios: 'always', spacedAccordionItems: false },
        // Name, email and phone are already in the form above (sent with
        // the payment below) — not asking twice also keeps Stripe's Link
        // sign-up prompt out of the way.
        fields: { billingDetails: { name: 'never', email: 'never', phone: 'never' } },
        wallets: { applePay: 'auto', googlePay: 'auto' },
      }} />
      {error && <p className="ck-error" role="alert"><i className="fas fa-exclamation-circle" /> {error}</p>}
      <button type="button" className="ck-pay-btn" onClick={pay} disabled={!ready || busy || !stripe}>
        {busy
          ? <><i className="fas fa-circle-notch fa-spin" /> Paiement en cours…</>
          : <><i className="fas fa-lock" /> Payer {euro.format(amount)}</>}
      </button>
    </div>
  )
}

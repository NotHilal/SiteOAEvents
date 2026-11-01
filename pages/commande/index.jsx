import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import Seo from '../../src/components/Seo.jsx'
import Icon from '../../src/components/Icon.jsx'
import DateRangePicker from '../../src/components/checkout/DateRangePicker.jsx'
import { supabase } from '../../src/lib/supabase.js'
import { getDayType, getMinOrderQty, getUnitPriceTtc, groupTiersByMaterial } from '../../src/lib/pricing.js'
import { getCartDates, setCartDates, setCatalogueCart } from '../../src/lib/cart.js'
import { useCatalogueCart } from '../../src/components/product/productUtils.js'
import { slugify } from '../../src/lib/slug.js'
import { track } from '../../src/lib/analytics.js'

// Stripe's code only loads with the payment form, on this page.
const StripePayment = dynamic(() => import('../../src/components/checkout/StripePayment.jsx'), {
  ssr: false,
  loading: () => <p className="ck-muted"><i className="fas fa-circle-notch fa-spin" /> Chargement du paiement sécurisé…</p>,
})

// Checkout, Amazon-style: one page — dates, delivery details, payment — next
// to the basket summary. Paying creates the order; it is confirmed the
// moment the payment succeeds (src/lib/orders.js). The basket is the shared
// cart (src/lib/cart.js), emptied on the confirmation page.

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const EMPTY_FORM = { prenom: '', nom: '', email: '', phone: '', address: '', message: '', website: '' }
const FORM_KEY = 'oa_checkout_form'
const ATTEMPT_KEY = 'oa_checkout_attempt'
const DEFAULT_MAX_DAYS = 7
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const readSession = key => { try { return JSON.parse(sessionStorage.getItem(key) || 'null') } catch { return null } }
const writeSession = (key, value) => { try { sessionStorage.setItem(key, JSON.stringify(value)) } catch {} }
const longDate = ds => new Date(ds + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })

export default function Checkout() {
  const router = useRouter()
  const cart = useCatalogueCart()
  const [cartReady, setCartReady] = useState(false)
  const ids = useMemo(() => Object.keys(cart).filter(id => cart[id] > 0), [cart])
  const idsKey = ids.join(',')

  const [materials, setMaterials] = useState({})
  const [tiers, setTiers] = useState({})
  const [blocked, setBlocked] = useState(new Set())
  const [maxDays, setMaxDays] = useState(DEFAULT_MAX_DAYS)
  const [available, setAvailable] = useState(null) // online payment configured?
  const [dates, setDates] = useState([])
  const [stock, setStock] = useState({}) // { id: available units over `dates` }
  const [form, setForm] = useState(EMPTY_FORM)
  const [suggestions, setSuggestions] = useState([])
  const [quote, setQuote] = useState(null)
  const [quoteState, setQuoteState] = useState({ loading: false, error: '' })
  const [showErrors, setShowErrors] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const debounce = useRef(null)

  // Restore what the visitor already typed (also after a PayPal / 3-D
  // Secure redirect that didn't complete) and the dates from the cart.
  useEffect(() => {
    const saved = readSession(FORM_KEY)
    if (saved) setForm(f => ({ ...f, ...saved, website: '' }))
    const cartDates = getCartDates()
    if (cartDates.length) setDates(cartDates)
    setCartReady(true)
    fetch('/api/checkout').then(r => r.json()).then(r => setAvailable(!!r.data?.available)).catch(() => setAvailable(false))
    Promise.all([
      supabase.from('blocked_dates').select('date'),
      supabase.from('blocked_hours').select('date'),
      supabase.from('site_content').select('*').eq('key', 'max_consecutive_days'),
    ]).then(([days, hours, setting]) => {
      setBlocked(new Set([...(days.data || []), ...(hours.data || [])].map(r => r.date)))
      const n = parseInt(setting.data?.[0]?.value, 10)
      if (n > 0) setMaxDays(n)
    })
    track('Début commande')
  }, [])

  useEffect(() => { if (cartReady) writeSession(FORM_KEY, { ...form, website: '' }) }, [form, cartReady])
  useEffect(() => { if (cartReady) setCartDates(dates) }, [dates, cartReady])

  useEffect(() => {
    if (!ids.length) return
    let cancelled = false
    Promise.all([
      supabase.from('materials').select('*').in('id', ids),
      supabase.from('material_price_tiers').select('*').in('material_id', ids),
    ]).then(([m, t]) => {
      if (cancelled) return
      setMaterials(Object.fromEntries((m.data || []).map(x => [String(x.id), x])))
      setTiers(groupTiersByMaterial(t.data || []))
    })
    return () => { cancelled = true }
  }, [idsKey])

  // Units still free over the chosen days, for every item in the basket.
  useEffect(() => {
    if (!ids.length || !dates.length) { setStock({}); return }
    let cancelled = false
    fetch(`/api/availability?ids=${encodeURIComponent(idsKey)}&dates=${encodeURIComponent(dates.join(','))}`)
      .then(r => r.json())
      .then(r => { if (!cancelled) setStock(Object.fromEntries(Object.entries(r.data || {}).map(([id, s]) => [id, s.available]))) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [idsKey, dates.join(',')])

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
  const isDisabled = ds => ds <= today || blocked.has(ds)
  const dayType = dates.length ? getDayType(dates[0]) : 'weekday'

  const lines = ids.map(id => {
    const material = materials[id]
    const quantity = cart[id]
    const minQty = getMinOrderQty(tiers[id])
    const unit = getUnitPriceTtc(tiers[id], dayType, Math.max(quantity, minQty))
    const free = dates.length && stock[id] != null ? stock[id] : null
    const problem = !material ? null
      : !material.available ? 'Cet article n’est plus proposé.'
      : free != null && free < quantity ? (free <= 0 ? 'Indisponible à ces dates.' : `Plus que ${free} disponible${free > 1 ? 's' : ''} à ces dates.`)
      : quantity < minQty ? `Minimum ${minQty} unités.`
      : null
    return { id, material, quantity, minQty, unit, free, problem, total: unit * quantity }
  })
  const loading = ids.length > 0 && lines.some(l => !l.material)
  const itemsTotal = Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100
  const delivery = quote?.fee ?? null
  const grandTotal = Math.round((itemsTotal + (delivery || 0)) * 100) / 100
  const count = lines.reduce((s, l) => s + l.quantity, 0)

  function setQuantity(line, quantity) {
    const next = { ...cart }
    if (quantity < line.minQty || quantity <= 0) delete next[line.id]
    else next[line.id] = Math.min(quantity, line.free ?? line.material?.max_quantity ?? 999)
    setCatalogueCart(next)
  }

  const field = key => ({ value: form[key], onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) })

  function onAddress(value) {
    setForm(f => ({ ...f, address: value }))
    setQuote(null)
    setQuoteState({ loading: false, error: '' })
    clearTimeout(debounce.current)
    if (value.trim().length < 3) { setSuggestions([]); return }
    debounce.current = setTimeout(() => {
      fetch('/api/geocode-suggest?q=' + encodeURIComponent(value)).then(r => r.json()).then(r => setSuggestions(r.data || [])).catch(() => setSuggestions([]))
    }, 350)
  }

  async function computeQuote(address) {
    if (!address.trim()) return
    setQuoteState({ loading: true, error: '' })
    try {
      const res = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }) })
      const result = await res.json()
      if (!res.ok) throw new Error(result.message || 'Adresse introuvable.')
      setQuote(result.data)
      setQuoteState({ loading: false, error: '' })
    } catch (err) {
      setQuote(null)
      setQuoteState({ loading: false, error: err.message })
    }
  }

  function pickSuggestion(s) {
    setForm(f => ({ ...f, address: s.label }))
    setSuggestions([])
    computeQuote(s.label)
  }

  // A saved address from a previous visit: price its delivery right away.
  useEffect(() => {
    if (cartReady && form.address.trim() && !quote && !quoteState.loading && !quoteState.error) computeQuote(form.address)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartReady])

  const errors = {
    dates: !dates.length && 'Choisissez la date de votre événement.',
    prenom: !form.prenom.trim() && 'Prénom requis.',
    nom: !form.nom.trim() && 'Nom requis.',
    email: !EMAIL_RE.test(form.email.trim()) && 'Email invalide.',
    phone: form.phone.replace(/\D/g, '').length < 9 && 'Téléphone requis.',
    address: (!form.address.trim() && 'Adresse de livraison requise.') || (!quote && !quoteState.loading && !quoteState.error && 'Choisissez votre adresse dans la liste pour calculer la livraison.'),
  }
  const lineProblem = lines.some(l => l.problem)
  const valid = !Object.values(errors).some(Boolean) && !lineProblem && !loading && quote && !quoteState.loading

  function validate() {
    setShowErrors(true)
    if (valid) return true
    const firstError = document.querySelector('.ck-section.has-error')
    firstError?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return false
  }

  const payload = () => ({
    prenom: form.prenom.trim(), nom: form.nom.trim(), email: form.email.trim(), phone: form.phone.trim(),
    date: dates[0], dates, time_type: 'full', hours: [],
    materials: lines.map(l => ({ id: l.id, quantity: l.quantity })),
    delivery_address: form.address.trim(), message: form.message.trim() || null,
    grand_total: grandTotal, website: form.website,
  })

  // One order per basket: retrying the same basket resumes the same order
  // (and Stripe payment); a changed basket starts a new one and releases
  // the previous hold.
  async function createPayment() {
    const body = payload()
    const fingerprint = JSON.stringify(body)
    const attempt = readSession(ATTEMPT_KEY)
    let key = attempt?.key
    let replaces
    if (!key || attempt.fingerprint !== fingerprint) { replaces = key; key = crypto.randomUUID() }
    writeSession(ATTEMPT_KEY, { key, fingerprint })
    const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, checkout_key: key, replaces_checkout_key: replaces }) })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) {
      // Expired/changed order: the next click starts a fresh one.
      if (res.status === 409) writeSession(ATTEMPT_KEY, null)
      throw new Error(result.message || 'La commande n’a pas pu être créée. Réessayez.')
    }
    return result.data
  }

  function onPaid({ order }) {
    track('Commande payée', { articles: lines.length })
    router.push({ pathname: '/commande/confirmation', query: { payment_intent: order.paymentIntentId, payment_intent_client_secret: order.clientSecret } })
  }

  if (!cartReady) return <CheckoutShell />

  if (!ids.length) {
    return (
      <CheckoutShell>
        <div className="ck-empty">
          <Icon name="cart" ion size={56} />
          <h1>Votre panier est vide</h1>
          <p>Ajoutez le mobilier et la décoration de votre événement depuis le catalogue, puis revenez ici pour commander.</p>
          <Link href="/catalogue/complet" className="shop-btn shop-btn-gold shop-btn-xl">Parcourir le catalogue</Link>
        </div>
      </CheckoutShell>
    )
  }

  const err = key => showErrors && errors[key]

  return (
    <CheckoutShell>
      <div className="ck-layout">
        <div className="ck-main">
          <h1 className="ck-title">Finaliser ma commande</h1>
          {available === false && (
            <p className="ck-notice"><i className="fas fa-info-circle" /> Le paiement en ligne n’est pas encore ouvert. <Link href="/contact">Contactez-nous</Link> pour réserver ce panier.</p>
          )}

          <section className={`ck-section${err('dates') ? ' has-error' : ''}`} aria-labelledby="ck-dates">
            <h2 id="ck-dates" className="ck-section-title"><span className="ck-step">1</span> Date de l’événement</h2>
            <div className="ck-dates">
              <DateRangePicker value={dates} onChange={setDates} maxDays={maxDays} isDisabled={isDisabled} />
              <div className="ck-dates-summary">
                {dates.length ? (
                  <>
                    <span className="ck-label">{dates.length > 1 ? 'Du' : 'Le'}</span>
                    <strong>{longDate(dates[0])}</strong>
                    {dates.length > 1 && <><span className="ck-label">au</span><strong>{longDate(dates[dates.length - 1])}</strong></>}
                    <span className={`ck-rate${dayType === 'weekend' ? ' is-weekend' : ''}`}>{dates.length} jour{dates.length > 1 ? 's' : ''} · tarif {dayType === 'weekend' ? 'week-end' : 'semaine'}</span>
                  </>
                ) : <span className="ck-muted">Aucune date choisie</span>}
              </div>
            </div>
            {err('dates') && <p className="ck-field-error">{errors.dates}</p>}
          </section>

          <section className={`ck-section${['prenom', 'nom', 'email', 'phone', 'address'].some(err) ? ' has-error' : ''}`} aria-labelledby="ck-delivery">
            <h2 id="ck-delivery" className="ck-section-title"><span className="ck-step">2</span> Livraison et coordonnées</h2>
            <div className="ck-grid">
              <Field label="Prénom" error={err('prenom')}><input autoComplete="given-name" {...field('prenom')} /></Field>
              <Field label="Nom" error={err('nom')}><input autoComplete="family-name" {...field('nom')} /></Field>
              <Field label="Email" error={err('email')}><input type="email" autoComplete="email" {...field('email')} /></Field>
              <Field label="Téléphone" error={err('phone')}><input type="tel" autoComplete="tel" inputMode="tel" maxLength={20} {...field('phone')} /></Field>
              <Field label="Adresse de livraison" wide error={err('address')}>
                <div className="ck-address">
                  <input
                    autoComplete="off"
                    placeholder="N°, rue, code postal, ville"
                    value={form.address}
                    onChange={e => onAddress(e.target.value)}
                    onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setSuggestions([]); computeQuote(form.address) } }}
                    aria-autocomplete="list"
                  />
                  {!quote && !quoteState.loading && form.address.trim().length > 5 && !suggestions.length && (
                    <button type="button" className="ck-address-btn" onClick={() => computeQuote(form.address)}>Calculer la livraison</button>
                  )}
                  {suggestions.length > 0 && (
                    <ul className="ck-suggestions" role="listbox">
                      {suggestions.map((s, i) => (
                        <li key={i} role="option" aria-selected="false" onMouseDown={() => pickSuggestion(s)}><i className="fas fa-map-marker-alt" /> {s.label}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {quoteState.loading && <span className="ck-hint"><i className="fas fa-circle-notch fa-spin" /> Calcul de la livraison…</span>}
                {quoteState.error && <span className="ck-field-error">{quoteState.error} <button type="button" className="ck-link" onClick={() => computeQuote(form.address)}>Réessayer</button></span>}
                {quote && <span className="ck-hint ck-ok"><i className="fas fa-truck" /> Livraison et installation : {euro.format(quote.fee)} ({quote.distanceKm} km)</span>}
              </Field>
              <Field label="Précisions (facultatif)" wide>
                <textarea rows={2} placeholder="Horaire souhaité, accès, étage…" maxLength={2000} {...field('message')} />
              </Field>
            </div>
            <div className="hp-field" aria-hidden="true">
              <label htmlFor="ck-website">Ne pas remplir</label>
              <input id="ck-website" tabIndex={-1} autoComplete="off" {...field('website')} />
            </div>
          </section>

          <section className="ck-section" aria-labelledby="ck-payment">
            <h2 id="ck-payment" className="ck-section-title"><span className="ck-step">3</span> Paiement</h2>
            {available ? (
              <StripePayment
                amount={grandTotal}
                ready={!loading}
                validate={validate}
                createPayment={createPayment}
                onPaid={onPaid}
                billingDetails={{ name: `${form.prenom} ${form.nom}`.trim(), email: form.email.trim(), phone: form.phone.trim() }}
              />
            ) : available === false ? (
              <p className="ck-muted">Paiement par carte et PayPal bientôt disponible.</p>
            ) : null}
            {showErrors && !valid && <p className="ck-field-error">Complétez les informations signalées ci-dessus.</p>}
            <p className="ck-legal">
              En payant, vous acceptez nos <Link href="/cgv">conditions générales de vente</Link>. Vos données servent uniquement à traiter votre commande (<Link href="/confidentialite">confidentialité</Link>).
            </p>
          </section>
        </div>

        <aside className={`ck-summary${summaryOpen ? ' is-open' : ''}`} aria-labelledby="ck-summary-title">
          <button type="button" className="ck-summary-toggle" onClick={() => setSummaryOpen(o => !o)} aria-expanded={summaryOpen}>
            <span><i className="fas fa-shopping-bag" /> {summaryOpen ? 'Masquer' : 'Afficher'} le panier ({count})</span>
            <strong>{euro.format(grandTotal)}</strong>
          </button>
          <div className="ck-summary-body">
            <h2 id="ck-summary-title" className="ck-summary-title">Votre panier <span>{count} article{count > 1 ? 's' : ''}</span></h2>
            <ul className="ck-lines">
              {lines.map(line => {
                const slug = line.material ? (line.material.slug || slugify(line.material.name)) : ''
                return (
                  <li key={line.id} className={`ck-line${line.problem ? ' has-problem' : ''}`}>
                    <Link href={slug ? `/catalogue/${slug}` : '/catalogue'} className="ck-line-img">
                      {line.material?.image_url ? <img src={line.material.image_url} alt="" /> : <Icon name="image" size={22} />}
                    </Link>
                    <div className="ck-line-main">
                      <span className="ck-line-name">{line.material?.name || 'Chargement…'}</span>
                      <span className="ck-line-unit">{euro.format(line.unit)} / unité</span>
                      <div className="ck-line-actions">
                        <div className="ck-qty" aria-label={`Quantité de ${line.material?.name || 'cet article'}`}>
                          <button type="button" onClick={() => setQuantity(line, line.quantity - 1)} aria-label="Diminuer">−</button>
                          <span>{line.quantity}</span>
                          <button type="button" onClick={() => setQuantity(line, line.quantity + 1)} disabled={line.free != null && line.quantity >= line.free} aria-label="Augmenter">+</button>
                        </div>
                        <button type="button" className="ck-link" onClick={() => setQuantity(line, 0)}>Retirer</button>
                      </div>
                      {line.problem && <span className="ck-field-error">{line.problem}</span>}
                    </div>
                    <strong className="ck-line-total">{euro.format(line.total)}</strong>
                  </li>
                )
              })}
            </ul>
            <dl className="ck-totals">
              <div><dt>Articles</dt><dd>{euro.format(itemsTotal)}</dd></div>
              <div><dt>Livraison et installation</dt><dd>{delivery != null ? euro.format(delivery) : <span className="ck-muted">selon l’adresse</span>}</dd></div>
              <div className="ck-total"><dt>Total TTC</dt><dd>{euro.format(grandTotal)}</dd></div>
            </dl>
            {!dates.length && <p className="ck-hint">Les tarifs s’ajustent à la date choisie (semaine ou week-end).</p>}
            <ul className="ck-trust">
              <li><i className="fas fa-lock" /> Paiement sécurisé par Stripe</li>
              <li><i className="fas fa-truck" /> Livraison et installation en Île-de-France</li>
              <li><i className="fas fa-envelope-open-text" /> Confirmation immédiate par email</li>
            </ul>
            <Link href="/catalogue/complet" className="ck-link ck-continue"><i className="fas fa-arrow-left" /> Continuer mes achats</Link>
          </div>
        </aside>
      </div>
    </CheckoutShell>
  )
}

function CheckoutShell({ children }) {
  return (
    <>
      <Seo title="Commande" description="Finalisez votre commande de location OA Événementiel." path="/commande" noindex />
      <div className="site-wrap ck-page">
        <div className="oa-container">{children}</div>
      </div>
    </>
  )
}

function Field({ label, wide, error, children }) {
  return (
    <label className={`ck-field${wide ? ' is-wide' : ''}${error ? ' has-error' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <span className="ck-field-error">{error}</span>}
    </label>
  )
}

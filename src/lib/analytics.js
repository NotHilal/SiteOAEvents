import { hasAnalyticsConsent } from './consent.js'

// Privacy-friendly audience measurement (Plausible: no cookies, no
// cross-site tracking), loaded ONLY after consent. Inactive until
// NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set (e.g. "oa-evenementiel.fr");
// NEXT_PUBLIC_PLAUSIBLE_SRC can point at a self-hosted instance.
//
// Conversion events (never send personal data in props — no email, name,
// phone, address or order reference):
//   'Clic Réserver', 'Ajout panier', 'Début réservation',
//   'Demande envoyée', 'Simulation terminée', 'Contact envoyé'

const DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
const SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js'
const SCRIPT_ID = 'oa-analytics'

export function loadAnalytics() {
  if (typeof window === 'undefined' || !DOMAIN || !hasAnalyticsConsent()) return
  if (document.getElementById(SCRIPT_ID)) return
  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments) }
  const s = document.createElement('script')
  s.id = SCRIPT_ID
  s.defer = true
  s.src = SRC
  s.setAttribute('data-domain', DOMAIN)
  document.head.appendChild(s)
}

// Consent withdrawn: stop sending anything. Plausible sets no cookies, so
// there is nothing to delete client-side.
export function unloadAnalytics() {
  if (typeof window === 'undefined') return
  document.getElementById(SCRIPT_ID)?.remove()
  window.plausible = function () {}
}

export function track(event, props) {
  if (typeof window === 'undefined' || !hasAnalyticsConsent() || typeof window.plausible !== 'function') return
  try { window.plausible(event, props ? { props } : undefined) } catch {}
}

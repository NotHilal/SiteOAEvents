import { hasAnalyticsConsent } from './consent.js'

// Audience measurement, loaded ONLY after consent:
// - Google Tag Manager (container below);
// - Plausible, if NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set (e.g. "oa-evenementiel.fr");
//   NEXT_PUBLIC_PLAUSIBLE_SRC can point at a self-hosted instance.
//
// Conversion events (never send personal data in props — no email, name,
// phone, address or order reference):
//   'Clic Réserver', 'Ajout panier', 'Début réservation',
//   'Demande envoyée', 'Simulation terminée', 'Contact envoyé'

const DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
const SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js'
const SCRIPT_ID = 'oa-analytics'

const GTM_SRC = 'https://www.googletagmanager.com/gtm.js?id=GTM-T5W5G97Z'
const GTM_SCRIPT_ID = 'oa-gtm'

function loadGoogleTag() {
  if (document.getElementById(GTM_SCRIPT_ID)) return
  window.dataLayer = window.dataLayer || []
  window.gtag = function () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  const s = document.createElement('script')
  s.id = GTM_SCRIPT_ID
  s.async = true
  s.src = GTM_SRC
  document.head.appendChild(s)
}

function loadPlausible() {
  if (!DOMAIN || document.getElementById(SCRIPT_ID)) return
  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments) }
  const s = document.createElement('script')
  s.id = SCRIPT_ID
  s.defer = true
  s.src = SRC
  s.setAttribute('data-domain', DOMAIN)
  document.head.appendChild(s)
}

export function loadAnalytics() {
  if (typeof window === 'undefined' || !hasAnalyticsConsent() || isAdminPreview()) return
  loadGoogleTag()
  loadPlausible()
}

// Consent withdrawn: stop sending anything. Plausible sets no cookies, so
// removing it is enough. Tags started by GTM can't be stopped from outside:
// its cookies are deleted and the page reloaded without it.
export function unloadAnalytics() {
  if (typeof window === 'undefined') return
  document.getElementById(SCRIPT_ID)?.remove()
  window.plausible = function () {}
  if (!document.getElementById(GTM_SCRIPT_ID)) return
  const host = window.location.hostname.replace(/^www\./, '')
  for (const cookie of document.cookie.split('; ')) {
    const name = cookie.split('=')[0]
    if (!/^(_ga|_gid|_gat|_gcl)/.test(name)) continue
    for (const domain of ['', `; domain=${host}`, `; domain=.${host}`]) document.cookie = `${name}=; Max-Age=0; path=/${domain}`
  }
  window.location.reload()
}

// The site shown in the live preview of Espace OA > Contenu des pages is not a visit.
function isAdminPreview() {
  try { return window.parent !== window && window.parent.location.pathname.startsWith('/admin') } catch { return false }
}

export function track(event, props) {
  if (typeof window === 'undefined' || !hasAnalyticsConsent() || typeof window.plausible !== 'function' || isAdminPreview()) return
  try { window.plausible(event, props ? { props } : undefined) } catch {}
}

// Cookie / tracker consent. The site itself only uses strictly necessary
// storage (cart, this choice, admin session), which needs no consent — so
// the banner only exists once an optional tool is configured (analytics,
// via NEXT_PUBLIC_PLAUSIBLE_DOMAIN). Non-essential scripts are injected
// only after an explicit "yes" (see src/lib/analytics.js).

const KEY = 'oa_consent'
const VERSION = 1
const MAX_AGE_MS = 182 * 24 * 60 * 60 * 1000 // ~6 months, then ask again (CNIL guidance)
export const CONSENT_EVENT = 'oa-consent-changed'
export const OPEN_SETTINGS_EVENT = 'oa-open-cookie-settings'

export const ANALYTICS_AVAILABLE = !!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
export const HAS_OPTIONAL_TRACKERS = ANALYTICS_AVAILABLE

export function getConsent() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const c = JSON.parse(raw)
    if (c.v !== VERSION || !c.ts || Date.now() - c.ts > MAX_AGE_MS) return null
    return c
  } catch {
    return null
  }
}

export function setConsent({ analytics }) {
  const c = { v: VERSION, ts: Date.now(), analytics: !!analytics }
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch {}
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }))
  return c
}

export function hasAnalyticsConsent() {
  return ANALYTICS_AVAILABLE && !!getConsent()?.analytics
}

// Footer "Gestion des cookies" link and the privacy page button.
export function openCookieSettings() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))
}

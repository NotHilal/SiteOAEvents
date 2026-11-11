import { telHref, useSiteContact } from '../lib/cms/client.js'

// The company's e-mail / phone as set in Espace OA > Contenu des pages >
// Coordonnées — used by every page that shows them (legal pages included).
export function SiteEmail() {
  const { email } = useSiteContact()
  return <a href={`mailto:${email}`}>{email}</a>
}

export function SitePhone({ fallback = null }) {
  const { phone } = useSiteContact()
  return phone ? <a href={telHref(phone)}>{phone}</a> : fallback
}

// Customer-facing progress of a rental order, shared by Mon compte and the
// public /suivi page. A paid order's stored status stays `confirmed` for its
// whole life (src/lib/orders.js) — where it stands in the rental itself
// (delivery, rental days, pickup) is derived from its dates.
//
//   paid → delivered on the first day → rented → picked up (« reprise »,
//   CGV §5) after the last day

export const parisToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })

export const formatOrderDate = (ds, opts = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  new Date(ds + 'T12:00:00').toLocaleDateString('fr-FR', opts)

export function orderPeriod(dates) {
  if (!dates?.length) return ''
  if (dates.length === 1) return formatOrderDate(dates[0])
  return `Du ${formatOrderDate(dates[0], { day: 'numeric', month: 'long' })} au ${formatOrderDate(dates[dates.length - 1])}`
}

// { key, label, tone } — tone drives the badge colour (account.css).
export function orderPhase(order, today = parisToday()) {
  const first = order.dates?.[0]
  const last = order.dates?.[order.dates.length - 1]
  switch (order.status) {
    case 'awaiting_payment': return { key: 'awaiting_payment', label: 'Paiement en cours', tone: 'pending' }
    case 'expired': return { key: 'expired', label: 'Non payée', tone: 'muted' }
    case 'cancelled': return { key: 'cancelled', label: 'Annulée · remboursée', tone: 'muted' }
    case 'refused': return { key: 'refused', label: 'Refusée', tone: 'muted' }
    case 'pending': return { key: 'pending', label: 'En attente', tone: 'pending' }
    case 'terminee': return { key: 'done', label: 'Terminée', tone: 'done' }
  }
  if (!first || today < first) return { key: 'confirmed', label: 'Payée · livraison à venir', tone: 'active' }
  if (today <= last) return { key: 'rented', label: 'En location', tone: 'active' }
  return { key: 'done', label: 'Terminée', tone: 'done' }
}

// Steps of the tracking timeline; null for orders that never went ahead.
export function orderSteps(order, today = parisToday()) {
  const phase = orderPhase(order, today).key
  if (!['confirmed', 'rented', 'done'].includes(phase)) return null
  const first = order.dates[0]
  const last = order.dates[order.dates.length - 1]
  // Steps before `reached` are done, the one at `reached` is under way.
  const reached = { confirmed: 1, rented: 2, done: 4 }[phase]
  return [
    { label: 'Commande payée', detail: order.created_at ? formatOrderDate(order.created_at.slice(0, 10)) : '' },
    { label: 'Livraison et installation', detail: `Le ${formatOrderDate(first, { weekday: 'long', day: 'numeric', month: 'long' })} · horaire convenu avec vous` },
    { label: 'Location', detail: orderPeriod(order.dates) },
    { label: 'Reprise du matériel', detail: `Après le ${formatOrderDate(last, { day: 'numeric', month: 'long' })} · horaire convenu avec vous` },
  ].map((step, i) => ({ ...step, done: i < reached, current: i === reached }))
}

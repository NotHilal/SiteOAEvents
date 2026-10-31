import { useEffect, useState } from 'react'

const MAX_DAYS = 7
const iso = d => d.toLocaleDateString('sv-SE')
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return iso(d) }

// Every day from `from` to `to` (inclusive), capped at MAX_DAYS.
export function dayRange(from, to) {
  if (!from) return []
  const end = to && to >= from ? to : from
  const out = []
  const d = new Date(from + 'T12:00:00')
  while (iso(d) <= end && out.length < MAX_DAYS) { out.push(iso(d)); d.setDate(d.getDate() + 1) }
  return out
}

const fmt = ds => new Date(ds + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })

// "Vérifier la disponibilité": the visitor picks the event day (or first and
// last day) and sees how many units are free — live from current orders
// (/api/availability). `onDates` hands the chosen days up so "Réserver"
// can carry them into the booking wizard.
export default function AvailabilityCheck({ variantId, qty, onDates, onResult }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [state, setState] = useState({ status: 'idle' })
  const days = dayRange(from, to)
  const daysKey = days.join(',')

  useEffect(() => { onDates?.(days) }, [daysKey])

  useEffect(() => {
    if (!variantId || !days.length) { setState({ status: 'idle' }); onResult?.(null); return }
    let cancelled = false
    setState({ status: 'loading' })
    fetch(`/api/availability?ids=${encodeURIComponent(variantId)}&dates=${daysKey}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error())))
      .then(({ data }) => {
        if (cancelled) return
        const available = data?.[variantId]?.available ?? 0
        setState({ status: 'done', available })
        onResult?.(available)
      })
      .catch(() => { if (!cancelled) { setState({ status: 'error' }); onResult?.(null) } })
    return () => { cancelled = true }
  }, [variantId, daysKey])

  const enough = state.status === 'done' && state.available >= Math.max(1, qty || 1)

  return (
    <div className="shop-avail">
      <p className="shop-avail-title"><i className="far fa-calendar-check" /> Vérifier la disponibilité</p>
      <div className="shop-avail-fields">
        <label>
          <span>Du</span>
          <input type="date" min={tomorrow()} value={from} onChange={e => { setFrom(e.target.value); if (to && to < e.target.value) setTo('') }} />
        </label>
        <label>
          <span>Au <small>(optionnel)</small></span>
          <input type="date" min={from || tomorrow()} value={to} disabled={!from} onChange={e => setTo(e.target.value)} />
        </label>
      </div>
      <p className="shop-avail-result" role="status" aria-live="polite">
        {state.status === 'idle' && 'Choisissez la date de votre événement.'}
        {state.status === 'loading' && <><i className="fas fa-circle-notch fa-spin" /> Vérification…</>}
        {state.status === 'error' && 'Vérification impossible pour le moment. Réessayez.'}
        {state.status === 'done' && (
          <span className={enough ? 'is-ok' : 'is-ko'}>
            <i className={`fas ${enough ? 'fa-check-circle' : 'fa-times-circle'}`} />{' '}
            {state.available > 0
              ? <><strong>{state.available}</strong> disponible{state.available > 1 ? 's' : ''} {days.length > 1 ? `du ${fmt(days[0])} au ${fmt(days[days.length - 1])}` : `le ${fmt(days[0])}`}</>
              : <>Plus disponible {days.length > 1 ? 'sur cette période' : 'à cette date'}</>}
            {!enough && state.available > 0 && <> — moins que la quantité choisie</>}
          </span>
        )}
      </p>
    </div>
  )
}

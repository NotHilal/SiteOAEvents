import { useState } from 'react'
import { getDayType } from '../../lib/pricing.js'

// Checkout calendar: one month at a time, two clicks pick a period (first
// day, then last day — up to `maxDays` consecutive available days). A
// click on an earlier day, an unreachable day or inside a period starts a
// new pick there. Keyboard-operable; weekend/holiday days (weekend rate)
// are marked.

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export const isoDate = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
export const addDays = (ds, n) => { const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDate(d) }

export default function DateRangePicker({ value, onChange, maxDays, isDisabled }) {
  // Opens on the chosen period, else on the first bookable day (tomorrow at
  // the earliest — on the last day of a month, that's next month).
  const first = value[0] ? new Date(value[0] + 'T00:00:00') : new Date(Date.now() + 86400000)
  const [view, setView] = useState({ year: first.getFullYear(), month: first.getMonth() })
  const today = new Date()
  const atCurrentMonth = view.year === today.getFullYear() && view.month === today.getMonth()

  // Days that can close the period started on value[0].
  const reachable = new Set()
  if (value.length === 1) {
    let cursor = value[0]
    for (let n = 1; n < maxDays; n++) {
      cursor = addDays(cursor, 1)
      if (isDisabled(cursor)) break
      reachable.add(cursor)
    }
  }

  function pick(ds) {
    if (value.length === 1 && ds === value[0]) return onChange([])
    if (value.length === 1 && reachable.has(ds)) {
      const range = [value[0]]
      while (range[range.length - 1] < ds) range.push(addDays(range[range.length - 1], 1))
      return onChange(range)
    }
    onChange([ds])
  }

  function shift(delta) {
    const d = new Date(view.year, view.month + delta, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }

  const offset = (new Date(view.year, view.month, 1).getDay() + 6) % 7
  const days = new Date(view.year, view.month + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
    const n = i - offset + 1
    return n < 1 || n > days ? null : isoDate(new Date(view.year, view.month, n))
  })
  const start = value[0]
  const end = value[value.length - 1]

  return (
    <div className="ck-cal">
      <div className="ck-cal-head">
        <button type="button" className="ck-cal-nav" onClick={() => shift(-1)} disabled={atCurrentMonth} aria-label="Mois précédent"><i className="fas fa-chevron-left" /></button>
        <span className="ck-cal-month" aria-live="polite">{MONTHS[view.month]} {view.year}</span>
        <button type="button" className="ck-cal-nav" onClick={() => shift(1)} aria-label="Mois suivant"><i className="fas fa-chevron-right" /></button>
      </div>
      <div className="ck-cal-grid" role="grid">
        {WEEKDAYS.map((d, i) => <span key={i} className="ck-cal-wd" aria-hidden="true">{d}</span>)}
        {cells.map((ds, i) => {
          if (!ds) return <span key={i} />
          const disabled = isDisabled(ds)
          const selected = value.includes(ds)
          const cls = ['ck-day',
            disabled && 'is-disabled',
            !disabled && getDayType(ds) === 'weekend' && 'is-weekend',
            selected && 'is-selected',
            selected && value.length > 1 && ds === start && 'is-start',
            selected && value.length > 1 && ds === end && 'is-end',
            selected && ds !== start && ds !== end && 'is-mid',
            reachable.has(ds) && 'is-reachable',
          ].filter(Boolean).join(' ')
          const label = new Date(ds + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
          return (
            <button key={ds} type="button" className={cls} disabled={disabled} aria-pressed={selected} aria-label={`${label}${disabled ? ', indisponible' : ''}`} onClick={() => pick(ds)}>
              {Number(ds.slice(8))}
            </button>
          )
        })}
      </div>
      <p className="ck-cal-hint">
        {value.length === 1
          ? (reachable.size ? 'Pour plusieurs jours, cliquez sur le dernier jour.' : 'Une seule journée est disponible à partir de cette date.')
          : `Cliquez sur le premier jour, puis sur le dernier (${maxDays} jours max.).`}
        <span className="ck-cal-legend"><span className="ck-dot is-weekend" /> Tarif week-end / férié</span>
      </p>
    </div>
  )
}

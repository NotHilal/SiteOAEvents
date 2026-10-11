import { useEffect, useState } from 'react'

// options.fr's quantity pill: − / number / + in one rounded field (see the
// templates at /example/product-single and /example/product-multiple).
//
// `allowZero` (multiple-options rows): 0 means "not chosen"; + from 0 jumps
// straight to the minimum, − from the minimum drops back to 0, so a value
// between 0 and the minimum is never possible.
export default function QtyStepper({ value, onChange, min = 1, max = null, allowZero = false, disabled = false, label, variant = 'single' }) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => { setDraft(String(value)) }, [value])

  const clamp = n => {
    if (!Number.isFinite(n) || n <= 0) return allowZero ? 0 : min
    if (allowZero && n < min) return min
    return Math.min(max || Infinity, Math.max(min, Math.round(n)))
  }
  const dec = () => onChange(allowZero && value <= min ? 0 : clamp(value - 1))
  const inc = () => onChange(allowZero && value === 0 ? clamp(min) : clamp(value + 1))
  const commit = () => {
    const next = clamp(parseInt(draft, 10))
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  const atMin = allowZero ? value === 0 : value <= min
  const atMax = max != null && value >= max

  return (
    <div className={`pdp-qty pdp-qty-${variant}${disabled ? ' is-disabled' : ''}`}>
      <button type="button" className="pdp-qty-btn" onClick={dec} disabled={disabled || atMin} aria-label={`Diminuer la quantité${label ? ` de ${label}` : ''}`}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="pdp-qty-input"
        value={draft}
        disabled={disabled}
        aria-label={`Quantité${label ? ` de ${label}` : ''}`}
        onChange={e => setDraft(e.target.value.replace(/\D/g, ''))}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
      />
      <button type="button" className="pdp-qty-btn" onClick={inc} disabled={disabled || atMax} aria-label={`Augmenter la quantité${label ? ` de ${label}` : ''}`}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
      </button>
    </div>
  )
}

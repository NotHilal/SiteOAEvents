import HelpTip from './HelpTip.jsx'
import { EMPTY_TIER } from './materialForm.js'

// The Tarification form (was inline in pages/espace-oa.jsx), now shared by
// a simple article and by each option of an article à options. Controlled:
// `pricing` = { tieredPricing, weekendDiffers, tiers }, `onChange(next)`.
const microLabel = { display: 'block', fontSize: '.66rem', fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 3 }
const checkRow = { display: 'flex', alignItems: 'flex-start', gap: 8, fontWeight: 400, fontSize: '.9rem', cursor: 'pointer' }

export default function PricingEditor({ pricing, onChange, error }) {
  const set = patch => onChange({ ...pricing, ...patch })
  const updateTier = (i, field, value) => set({ tiers: pricing.tiers.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)) })

  function toggleTiered() {
    // Turning it off collapses back to one band covering everything,
    // keeping whatever prices were on the first row.
    if (pricing.tieredPricing) {
      const first = pricing.tiers[0] || EMPTY_TIER
      set({ tieredPricing: false, tiers: [{ ...first, minQty: 1, maxQty: '' }] })
    } else set({ tieredPricing: true })
  }
  // The new row's "Qté min" defaults to (previous row's "Qté max" + 1):
  // tiers are meant to be contiguous. Left blank when the previous row is
  // the open-ended "∞" one.
  function addTier() {
    const last = pricing.tiers[pricing.tiers.length - 1]
    const lastMax = last && last.maxQty !== '' && last.maxQty != null ? parseInt(last.maxQty, 10) : NaN
    set({ tiers: [...pricing.tiers, { ...EMPTY_TIER, minQty: !isNaN(lastMax) ? String(lastMax + 1) : '' }] })
  }

  return (
    <div className="adm-form-group" style={{ marginTop: 8 }}>
      <label style={{ ...checkRow, marginBottom: 8 }}>
        <input type="checkbox" checked={pricing.tieredPricing} onChange={toggleTiered} style={{ marginTop: 3, flexShrink: 0 }} />
        {/* min-width:0 lets the text wrap instead of pushing the help icon
            off-screen on narrow phones (a flex item's min-width is "auto"). */}
        <span style={{ minWidth: 0 }}>Le tarif change selon la quantité louée</span>
        <HelpTip text="Permet de fixer un prix différent selon la quantité louée, via des paliers (ex : moins cher à partir de 10 unités)." />
      </label>
      <label style={{ ...checkRow, marginBottom: 6 }}>
        <input type="checkbox" checked={pricing.weekendDiffers} onChange={() => set({ weekendDiffers: !pricing.weekendDiffers })} style={{ marginTop: 3, flexShrink: 0 }} />
        <span style={{ minWidth: 0 }}>Le tarif est différent le week-end / jours fériés</span>
        <HelpTip text="« Week-end » = vendredi à dimanche + jours fériés. « Semaine » = lundi à jeudi. Appliqué automatiquement selon la date choisie par le client." />
      </label>

      {pricing.tieredPricing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '14px 0 8px' }}>
          <span style={{ fontSize: '.75rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--dark-mid)' }}>Paliers de quantité</span>
          <HelpTip text={'Chaque ligne fixe un prix pour une tranche de quantité louée : par exemple 1 à 19 unités à un tarif, puis 20 unités et plus à un tarif dégressif. Le "Qté min" de la toute première ligne devient aussi la quantité minimale imposée au client pour cet article — ex : si la 1ère ligne commence à 20, il ne pourra jamais en louer moins de 20 (comme pour la Chaise Napoléon).'} />
        </div>
      )}

      {pricing.tiers.map((t, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap' }}>
          {pricing.tieredPricing && (
            <>
              <div>
                <span style={microLabel}>Qté min</span>
                <input type="number" min={1} className="adm-input" style={{ width: 80 }} placeholder="Qté min" value={t.minQty} onChange={e => updateTier(i, 'minQty', e.target.value)} />
              </div>
              <span style={{ color: 'var(--gray)', lineHeight: '38px', marginTop: 16 }}>à</span>
              <div>
                <span style={microLabel}>Qté max</span>
                <input type="number" min={1} className="adm-input" style={{ width: 80 }} placeholder="∞" value={t.maxQty} onChange={e => updateTier(i, 'maxQty', e.target.value)} />
              </div>
            </>
          )}
          <div>
            {pricing.weekendDiffers && <span style={microLabel}>Semaine</span>}
            <input type="number" min={0} step="0.01" className="adm-input" style={{ width: 130 }} placeholder={pricing.weekendDiffers ? 'Prix semaine HT' : 'Prix HT'} value={t.weekday} onChange={e => updateTier(i, 'weekday', e.target.value)} />
            {t.weekday !== '' && !isNaN(parseFloat(t.weekday)) && <div style={{ fontSize: '.72rem', color: 'var(--gray)', marginTop: 2 }}>= {(parseFloat(t.weekday) * 1.2).toFixed(2)} € TTC</div>}
          </div>
          {pricing.weekendDiffers && (
            <div>
              <span style={microLabel}>Week-end / Férié</span>
              <input type="number" min={0} step="0.01" className="adm-input" style={{ width: 130 }} placeholder="Prix week-end HT" value={t.weekend} onChange={e => updateTier(i, 'weekend', e.target.value)} />
              {t.weekend !== '' && !isNaN(parseFloat(t.weekend)) && <div style={{ fontSize: '.72rem', color: 'var(--gray)', marginTop: 2 }}>= {(parseFloat(t.weekend) * 1.2).toFixed(2)} € TTC</div>}
            </div>
          )}
          {pricing.tieredPricing && pricing.tiers.length > 1 && (
            <button type="button" className="adm-btn-delete btn-sm" aria-label="Supprimer ce palier" onClick={() => set({ tiers: pricing.tiers.filter((_, idx) => idx !== i) })}><i className="fas fa-trash" /></button>
          )}
        </div>
      ))}
      {pricing.tieredPricing && (
        <button type="button" className="adm-btn-ghost btn-sm" onClick={addTier}><i className="fas fa-plus" style={{ marginRight: 4 }} />Ajouter un palier</button>
      )}
      {error && <div className="mat-form-error"><i className="fas fa-exclamation-circle" style={{ marginRight: 4 }} />{error}</div>}
    </div>
  )
}

import Link from 'next/link'
import { formatEuro, categoryLabel, catalogueCategoryHref, minQtyOf, unitPriceOf, tierRows } from './productUtils.js'

// The "Réf. : 35864" lines under the title in the options.fr templates —
// same look (bold black label, grey value), filled with what this
// catalogue actually knows about the item. Nothing is shown for data the
// item doesn't have.
export function ProductFacts({ variant, category, showVariant = false, qty }) {
  const minQty = minQtyOf(variant)
  const price = unitPriceOf(variant, qty ?? minQty)
  return (
    <dl className="pdp-facts">
      {showVariant && variant.variantLabel && (
        <div className="pdp-fact"><dt>Sélection :</dt><dd>{variant.variantLabel}</dd></div>
      )}
      {price > 0 && (
        <div className="pdp-fact"><dt>Prix :</dt><dd>dès {formatEuro(price)} TTC l'unité</dd></div>
      )}
      <div className="pdp-fact">
        <dt>Disponibilité :</dt>
        <dd className={variant.available ? 'pdp-stock-ok' : 'pdp-stock-out'}>{variant.available ? 'Disponible' : 'Indisponible'}</dd>
      </div>
      {minQty > 1 && (
        <div className="pdp-fact"><dt>Minimum :</dt><dd>{minQty} unités</dd></div>
      )}
      {category && (
        <div className="pdp-fact"><dt>Catégorie :</dt><dd><Link href={catalogueCategoryHref(category)}>{categoryLabel(category)}</Link></dd></div>
      )}
    </dl>
  )
}

// Rental rates by quantity band and day type — the item's real price sheet.
export function TariffTable({ variant }) {
  const rows = tierRows(variant)
  if (!rows.length) return null
  const sameRate = rows.every(r => r.weekday === r.weekend)
  return (
    <div className="pdp-tariffs">
      <h2 className="pdp-tariffs-title">Tarifs de location <span>(TTC, par unité)</span></h2>
      <table className="pdp-table">
        <thead>
          <tr>
            <th scope="col">Quantité</th>
            {sameRate
              ? <th scope="col" className="pdp-num">Prix</th>
              : <><th scope="col" className="pdp-num">Lun – jeu</th><th scope="col" className="pdp-num">Ven – dim &amp; fériés</th></>}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.range}>
              <td>{r.range}</td>
              <td className="pdp-num">{formatEuro(r.weekday)}</td>
              {!sameRate && <td className="pdp-num">{formatEuro(r.weekend)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pdp-tariffs-note">Le prix définitif dépend de la date et de la quantité, et vous est confirmé lors de la réservation.</p>
    </div>
  )
}

import Link from 'next/link'

// Frieze of the occasions on /evenements: one tall panel per occasion, the
// hovered one opening to show its description (seo-occ-grid in seo.css).
export default function OccasionPanels({ items }) {
  return (
    <ul className="seo-occ-grid">
      {items.map(item => (
        <li key={item.href}>
          <Link href={item.href} className="seo-occ-link">
            <img className="seo-occ-photo" src={item.image} alt={item.imageAlt} width="720" height="960" loading="lazy" decoding="async" />
            <span className="seo-occ-body">
              <span className="seo-occ-title">{item.title}</span>
              <span className="seo-occ-text">{item.text}</span>
            </span>
            <span className="seo-occ-arrow" aria-hidden="true"><i className="fas fa-arrow-right" /></span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

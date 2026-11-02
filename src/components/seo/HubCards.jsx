import Link from 'next/link'

// Grid of links to the pages of a section (zones, occasions, guides).
export default function HubCards({ items }) {
  return (
    <ul className="seo-hub-grid">
      {items.map(item => (
        <li key={item.href}>
          <Link href={item.href} className="seo-hub-card">
            <img src={item.image} alt={item.imageAlt} width="480" height="320" loading="lazy" decoding="async" />
            <span className="seo-hub-card-title">{item.title}</span>
            <span className="seo-hub-card-text">{item.text}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

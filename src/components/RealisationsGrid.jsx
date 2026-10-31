import Link from 'next/link'

export default function RealisationsGrid({ items }) {
  if (!items.length) return <div className="realisations-empty"><h2>Nos réalisations arrivent bientôt</h2><p>Les photos et récits de nos événements seront à découvrir ici.</p><Link href="/contact" className="oa-univers-link">Parlons de votre événement <i className="fas fa-arrow-right" aria-hidden="true" /></Link></div>
  return <div className="realisations-grid">{items.map(item => <article className="realisation-card" key={item.id}>
    <Link href={`/nos-realisations/${item.slug}`}>
      <img src={item.cover} alt="" loading="lazy" decoding="async" />
      <h2>{item.title}</h2><p>{item.summary}</p><span className="oa-univers-link">Découvrir la réalisation <i className="fas fa-arrow-right" aria-hidden="true" /></span>
    </Link>
  </article>)}</div>
}

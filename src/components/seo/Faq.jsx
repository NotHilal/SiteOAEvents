import Link from 'next/link'
import RichText from './RichText.jsx'

// Native <details>: the answers are in the HTML whether open or closed, and
// nothing depends on JS. The matching FAQPage JSON-LD is added by the page
// (faqLd in Seo.jsx).
// `itemProps(item, index)`: extra attributes per question (Espace OA preview).
export default function Faq({ items, title = 'Questions fréquentes', more = false, itemProps }) {
  if (!items?.length) return null
  return (
    <section className="seo-faq" aria-label={title}>
      <h2>{title}</h2>
      {items.map(({ q, a, ...rest }, i) => (
        <details key={q} {...itemProps?.({ q, a, ...rest }, i)}>
          <summary>{q}</summary>
          <p><RichText text={a} /></p>
        </details>
      ))}
      {more && <p className="seo-faq-more"><Link href="/faq">Toutes les questions fréquentes <i className="fas fa-arrow-right" aria-hidden="true" /></Link></p>}
    </section>
  )
}

import { useState } from 'react'
import Link from 'next/link'
import ShopCard from '../product/ShopCard.jsx'
import QuickView from '../product/QuickView.jsx'
import { useCatalogueCart } from '../product/productUtils.js'
import Faq from './Faq.jsx'
import RichText from './RichText.jsx'

// Shared template of the zone, occasion and guide pages (content in
// src/lib/seo/landings.js; `cards` from featuredCards in the page's
// getServerSideProps). `crumbs` excludes "Accueil"; the last one is the page.
export default function LandingPage({ page, h1, crumbs, cards = [], cardsTitle, faqTitle, children, cta }) {
  const cart = useCatalogueCart()
  const [quick, setQuick] = useState(null)
  const inCartOf = card => card.variants.reduce((n, v) => n + (cart[v.id] || 0), 0)

  return (
    <div className="site-wrap seo-page">
      <header className="seo-page-head">
        <div className="seo-page-head-text">
          <nav aria-label="Fil d’Ariane">
            <ol className="shop-crumbs">
              <li><Link href="/">Accueil</Link></li>
              {crumbs.slice(0, -1).map(c => <li key={c.path}><Link href={c.path}>{c.name}</Link></li>)}
              <li aria-current="page">{crumbs[crumbs.length - 1].name}</li>
            </ol>
          </nav>
          <h1>{h1}</h1>
          <p className="seo-page-lead"><RichText text={page.lead} /></p>
          {cta !== false && (
            <div className="seo-page-actions">
              <Link href="/catalogue/complet" className="shop-btn shop-btn-gold">Voir le catalogue</Link>
              <Link href="/contact" className="shop-btn shop-btn-ghost">Demander un devis</Link>
            </div>
          )}
        </div>
        {page.image && <img className="seo-page-photo" src={page.image} alt={page.imageAlt} width="720" height="540" fetchPriority="high" decoding="async" />}
      </header>

      <div className="seo-page-body">
        {(page.sections || []).map(s => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            <p><RichText text={s.p} /></p>
          </section>
        ))}

        {page.table && (
          <div className="seo-table-wrap">
            <table className="seo-table">
              <caption>{page.table.caption}</caption>
              <thead><tr>{page.table.head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
              <tbody>{page.table.rows.map(r => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}

        {page.checklist && (
          <section>
            <h2>{page.checklist.h}</h2>
            <ul>{page.checklist.items.map(item => <li key={item}>{item}</li>)}</ul>
          </section>
        )}

        {(page.after || []).map(s => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            <p><RichText text={s.p} /></p>
          </section>
        ))}

        {children}
      </div>

      {cards.length > 0 && (
        <section className="seo-page-products" aria-labelledby="seo-products-title">
          <div className="oa-container">
            <h2 id="seo-products-title">{cardsTitle || 'Le matériel à louer'}</h2>
            <div className="shop-grid">
              {cards.map(card => <ShopCard key={card.key} card={card} inCart={inCartOf(card)} onQuickView={setQuick} place="page conseil" />)}
            </div>
          </div>
        </section>
      )}

      {page.faq?.length > 0 && <div className="seo-page-body"><Faq items={page.faq} title={faqTitle} /></div>}

      {quick && <QuickView card={quick} onClose={() => setQuick(null)} />}
    </div>
  )
}

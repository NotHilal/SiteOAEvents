import Link from 'next/link'
import Seo from '../src/components/Seo.jsx'

// Real 404: Next serves this page with an HTTP 404 status for any unknown
// route (pages router), so search engines don't index dead URLs.
export default function NotFound() {
  return (
    <>
      <Seo
        title="Page introuvable"
        description="La page demandée n'existe pas ou a été déplacée."
        path="/404"
        noindex
      />
      <section className="nf-section">
        <div className="oa-container nf-inner">
          <p className="nf-code" aria-hidden="true">404</p>
          <h1 className="oa-section-title nf-title">Page introuvable</h1>
          <p className="nf-text">
            La page que vous cherchez n'existe pas ou a été déplacée. Pas d'inquiétude, votre événement vous attend
            toujours.
          </p>
          <div className="nf-actions">
            <Link href="/" className="btn btn-rose-gold">Retour à l'accueil</Link>
            <Link href="/catalogue" className="oa-univers-link">Voir le catalogue <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </>
  )
}

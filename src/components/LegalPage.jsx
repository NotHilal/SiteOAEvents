import Link from 'next/link'
import Seo from './Seo.jsx'

// Shared layout for the legal pages (mentions légales, confidentialité,
// CGU, CGV): readable single column, same page title treatment as the rest
// of the site.
export default function LegalPage({ title, description, path, updated, children }) {
  return (
    <>
      <Seo title={title} description={description} path={path} breadcrumb={[{ name: title, path }]} />
      <div className="site-wrap">
        <header className="legal-head">
          <div className="oa-container">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb legal-breadcrumb">
                <li className="breadcrumb-item"><Link href="/">Accueil</Link></li>
                <li className="breadcrumb-item active" aria-current="page">{title}</li>
              </ol>
            </nav>
            <h1>{title}</h1>
            {updated && <p className="legal-updated">Dernière mise à jour : {updated}</p>}
          </div>
        </header>
        <article className="legal-body">
          <div className="oa-container">
            <div className="legal-content">{children}</div>
          </div>
        </article>
      </div>
    </>
  )
}

// Information the company still has to provide — rendered as a visible
// highlighted marker so nothing ships to production half-filled unnoticed.
export function ToFill({ children }) {
  return <mark className="legal-tofill">[À compléter : {children}]</mark>
}

// Clauses that need a lawyer's review before going live.
export function ToValidate({ children }) {
  return (
    <aside className="legal-note" role="note">
      <strong>À valider juridiquement :</strong> {children}
    </aside>
  )
}

import Link from 'next/link'
import { useRouter } from 'next/router'
import Icon from './Icon.jsx'

export const ACCOUNT_NAV = [
  { href: '/mon-compte', label: 'Tableau de bord du compte', icon: 'person', exact: true },
  { href: '/mon-compte/informations', label: 'Informations du compte', icon: 'person' },
  { href: '/mon-compte/demandes-de-devis', label: 'Mes demandes de devis', icon: 'calculator' },
  { href: '/mon-compte/newsletter', label: 'Newsletter', icon: 'mail' },
  { href: '/mon-compte/liste-envies', label: 'Ma liste d’envies', icon: 'bag' },
  { href: '/mon-compte/deconnexion', label: 'Se déconnecter', icon: 'logOut' },
]

function isActive(router, item) {
  return item.exact ? router.pathname === item.href : router.pathname.startsWith(item.href)
}

export default function AccountLayout({ title, description, children }) {
  const router = useRouter()

  return (
    <div className="oa-account-page">
      <section className="oa-account-intro">
        <div className="oa-container">
          <nav className="oa-account-breadcrumb" aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link>
            <span aria-hidden="true">/</span>
            <Link href="/mon-compte">Mon compte</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </nav>
          <h1 className="oa-account-title">{title}</h1>
          {description && <p className="oa-account-description">{description}</p>}
        </div>
      </section>

      <div className="oa-container oa-account-layout">
        <aside className="oa-account-sidebar" aria-label="Navigation du compte">
          <div className="oa-account-sidebar-heading">
            <span>Mon espace</span>
            <span className="oa-account-sidebar-dot" aria-hidden="true" />
          </div>
          <nav>
            {ACCOUNT_NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`oa-account-nav-link${isActive(router, item) ? ' is-active' : ''}`}
                aria-current={isActive(router, item) ? 'page' : undefined}
              >
                <Icon name={item.icon} size={18} strokeWidth={1.5} />
                <span>{item.label}</span>
                <span className="oa-account-nav-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="oa-account-content">{children}</main>
      </div>
    </div>
  )
}

export function AccountSection({ title, children, className = '' }) {
  return (
    <section className={`oa-account-section ${className}`}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  )
}

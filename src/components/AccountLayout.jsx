import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Icon from './Icon.jsx'
import { CUSTOMER_AUTH_EVENT, fetchCustomerSession } from '../lib/customer-session.js'

export const ACCOUNT_NAV = [
  { href: '/mon-compte', label: 'Tableau de bord', icon: 'grid', exact: true },
  { href: '/mon-compte/commandes', label: 'Mes commandes', icon: 'package' },
  { href: '/mon-compte/informations', label: 'Informations du compte', icon: 'person' },
  { href: '/mon-compte/deconnexion', label: 'Se déconnecter', icon: 'logOut' },
]

function isActive(router, item) {
  return item.exact ? router.pathname === item.href : router.pathname.startsWith(item.href)
}

// `parent`: optional { href, label } breadcrumb step between Mon compte and
// the page (an order's page sits under Mes commandes).
export default function AccountLayout({ title, description, parent, children, requireAuth = true }) {
  const router = useRouter()
  const [authLoading, setAuthLoading] = useState(requireAuth)
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!requireAuth) { setAuthLoading(false); return }
    let active = true
    const sync = async () => {
      const current = await fetchCustomerSession()
      if (!active) return
      setUser(current)
      setAuthLoading(false)
      if (!current && router.isReady) {
        router.replace({ pathname: '/mon-compte/connexion', query: { next: router.asPath } })
      }
    }
    sync()
    window.addEventListener(CUSTOMER_AUTH_EVENT, sync)
    return () => { active = false; window.removeEventListener(CUSTOMER_AUTH_EVENT, sync) }
  }, [requireAuth, router.isReady, router.asPath])

  if (authLoading || (requireAuth && !user)) {
    return <div className="oa-account-auth-loading" role="status"><i className="fas fa-circle-notch fa-spin" /> Chargement de votre espace…</div>
  }

  return (
    <div className="oa-account-page">
      <section className="oa-account-intro">
        <div className="oa-container">
          <nav className="oa-account-breadcrumb" aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link>
            <span aria-hidden="true">/</span>
            <Link href="/mon-compte">Mon compte</Link>
            {parent && <><span aria-hidden="true">/</span><Link href={parent.href}>{parent.label}</Link></>}
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

        <main className="oa-account-content">{typeof children === 'function' ? children(user) : children}</main>
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

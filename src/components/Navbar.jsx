import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getCatalogueCartCount, CART_EVENT } from '../lib/cart.js'

export default function Navbar() {
  const router = useRouter()
  const isHome = router.pathname === '/'
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    const sync = () => setCartCount(getCatalogueCartCount())
    sync()
    window.addEventListener(CART_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CART_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  useEffect(() => {
    // Raw 'scroll' events can fire dozens of times per second (especially
    // from a trackpad) — calling setState on every single one competes with
    // the browser's own scroll rendering and was the main source of scroll
    // jank. Coalescing to one check per animation frame fixes that.
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24)
        ticking = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile panel on route change, and lock page scroll while it's open.
  useEffect(() => {
    const close = () => setMobileOpen(false)
    router.events.on('routeChangeStart', close)
    return () => router.events.off('routeChangeStart', close)
  }, [router.events])

  useEffect(() => {
    document.documentElement.style.overflowY = mobileOpen ? 'hidden' : ''
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    // Lenis (see _app.jsx) scrolls via wheel/touch interception, not just
    // native overflow — the overflow:hidden above alone doesn't stop it, so
    // it needs to be paused/resumed explicitly too.
    if (mobileOpen) window.__lenis?.stop()
    else window.__lenis?.start()
    return () => {
      document.documentElement.style.overflowY = ''; document.body.style.overflow = ''
      window.__lenis?.start()
    }
  }, [mobileOpen])

  // Contact lives in the floating ContactWidget (bottom-right on every
  // page) and Suivi de commande is reached from the confirmation email's
  // link (plus the footer), so neither takes a slot in the top bar.
  const NAV_LINKS = [
    { href: '/', label: 'Accueil' },
    { href: '/services', label: 'Prestations' },
    { href: '/catalogue', label: 'Catalogue' },
    { href: '/galerie', label: 'Galerie' },
    { href: '/devis', label: 'Simulation de Devis' },
    { href: '/a-propos', label: 'À Propos' },
  ]

  return (
    <section className={`main-header oa-navbar${scrolled ? ' oa-navbar-scrolled' : ''}`}>
      <div className="w-layout-blockcontainer container w-container">
        <div className="header-main-box">
          <Link href="/" className={`header-logo-link w-inline-block ${isHome ? 'w--current' : ''}`}>
            <span className="header-logo-glow">
              <img
                loading="lazy"
                src="/logo-icon.png"
                alt=""
                className="header-logo"
                style={{ width: 'auto', height: '44px', objectFit: 'contain' }}
              />
            </span>
            <span className="header-logo-text"><span className="header-logo-accent">OA</span> <em>Événementiel</em></span>
          </Link>

          <div className="header-menu-box">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`header-menu-link w-inline-block ${router.pathname === link.href ? 'w--current' : ''}`}
              >
                <p className="header-menu-text">{link.label}</p>
                <div className="header-menu-line"></div>
              </Link>
            ))}
          </div>

          <div className="header-btn-box">
            <Link href="/catalogue" className="header-cart-link" aria-label="Voir mon panier">
              <i className="fas fa-shopping-bag" />
              {cartCount > 0 && <span className="header-cart-badge">{cartCount}</span>}
            </Link>
            <div className="header-btn">
              <Link href="/reservation" className="theme-button w-inline-block">
                <div className="theme-button-content">
                  <div className="theme-button-text">Réserver</div>
                  <div className="theme-button-hover-text">Réserver</div>
                </div>
              </Link>
            </div>
            <button
              type="button"
              className={`mobile-menu-btn${mobileOpen ? ' is-open' : ''}`}
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(o => !o)}
            >
              <span className="hamburger-line" aria-hidden="true" />
              <span className="hamburger-line" aria-hidden="true" />
              <span className="hamburger-line" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`mobile-menu-overlay${mobileOpen ? ' is-open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <div className={`mobile-menu${mobileOpen ? ' is-open' : ''}`} role="dialog" aria-modal="true">
        <div className="mobile-logo-box">
          <Link href="/" className={`header-logo-link w-inline-block ${isHome ? 'w--current' : ''}`} onClick={() => setMobileOpen(false)}>
            <img
              loading="lazy"
              src="/logo-icon.png"
              alt=""
              className="header-logo"
              style={{ width: 'auto', height: '36px', objectFit: 'contain' }}
            />
            <span className="header-logo-text">OA <em>Événementiel</em></span>
          </Link>
          <button
            type="button"
            className="mobile-menu-close-btn"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>
        <div className="mobile-menu-box">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`mobile-dropdown-link w-inline-block ${router.pathname === link.href ? 'w--current' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <div className="mobile-dropdown-title">
                {link.label}
                {link.href === '/catalogue' && cartCount > 0 && (
                  <span className="header-cart-badge header-cart-badge-inline">{cartCount}</span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Pinned to the bottom of the drawer (not the end of the scrollable
            link list) so both CTAs stay reachable without scrolling, no
            matter how many nav links there are or how short the screen is —
            .mobile-menu-box is the only part that scrolls (see .mobile-menu
            flex layout in style.css). */}
        <div className="mobile-menu-footer">
          <Link
            href="/reservation"
            className="theme-button w-inline-block"
            style={{ width: '100%', textAlign: 'center' }}
            onClick={() => setMobileOpen(false)}
          >
            <div className="theme-button-content" style={{ justifyContent: 'center' }}>
              <div className="theme-button-text">Réserver</div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}

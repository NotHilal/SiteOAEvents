import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getCatalogueCartCount, CART_EVENT } from '../lib/cart.js'
import Icon from './Icon.jsx'
import { track } from '../lib/analytics.js'

// Header modelled on options.fr (saved reference at /example): three equal
// columns — "Menu" drawer toggle + primary CTA on the left, a large centered
// logo that compacts on scroll, and a row of thin outline icons with tooltips
// on the right. Every page lives in the slide-in drawer rather than in a
// crowded inline link row.

// Drawer contents: main pages as large uppercase lines, practical links as a
// smaller gold group beneath — same two-tier split as options.fr's menu.
const MAIN_LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/services', label: 'Prestations' },
  { href: '/catalogue', label: 'Catalogue' },
  { href: '/nos-experiences', label: 'Nos Expériences' },
  { href: '/galerie', label: 'Galerie' },
  { href: '/a-propos', label: 'À Propos' },
]
const SERVICE_LINKS = [
  { href: '/reservation', label: 'Réserver' },
  { href: '/devis', label: 'Simulation de devis' },
  { href: '/suivi', label: 'Suivi de commande' },
  { href: '/contact', label: 'Contact' },
]
const ICON_LINKS = [
  { href: '/devis', label: 'Simulation de devis', icon: 'calculator' },
  { href: '/suivi', label: 'Suivi de commande', icon: 'truck' },
  { href: '/contact', label: 'Contactez-nous', icon: 'mail' },
]

export default function Navbar() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const closeRef = useRef(null)
  const toggleRef = useRef(null)

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
    // Coalesced to one check per animation frame — setState on every raw
    // scroll event competes with the browser's own scroll rendering.
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

  // Close the drawer on route change.
  useEffect(() => {
    const close = () => setMenuOpen(false)
    router.events.on('routeChangeStart', close)
    return () => router.events.off('routeChangeStart', close)
  }, [router.events])

  // Lock page scroll while the drawer is open, and let Escape close it.
  useEffect(() => {
    document.documentElement.style.overflowY = menuOpen ? 'hidden' : ''
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    // Lenis (see _app.jsx) scrolls via wheel/touch interception, so
    // overflow:hidden alone doesn't stop it — pause it explicitly too.
    if (menuOpen) window.__lenis?.stop()
    else window.__lenis?.start()
    const onKey = e => { if (e.key === 'Escape') setMenuOpen(false) }
    if (menuOpen) {
      window.addEventListener('keydown', onKey)
      closeRef.current?.focus()
    }
    return () => {
      document.documentElement.style.overflowY = ''; document.body.style.overflow = ''
      window.__lenis?.start()
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const isCurrent = href => router.pathname === href

  return (
    <header className={`oah${scrolled ? ' oah-scrolled' : ''}${menuOpen ? ' is-menu-open' : ''}`}>
      <div className="oah-bar">
        <div className="oah-left">
          <button
            type="button"
            ref={toggleRef}
            className="oah-menu-toggle"
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
            aria-controls="oah-drawer"
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" size={26} />
            <span className="oah-menu-label">Menu</span>
          </button>
          <Link href="/reservation" className="oah-cta" onClick={() => track('Clic Réserver', { emplacement: 'header' })}>
            <Icon name="calendar" size={30} />
            <span>Réserver votre événement</span>
          </Link>
        </div>

        <div className="oah-center">
          <Link href="/" className="oah-logo" aria-label="OA Événementiel — accueil">
            <img src="/logo-icon-h128.webp" alt="" className="oah-logo-mark" width="164" height="128" fetchPriority="high" />
            <span className="oah-logo-words">
              <span className="oah-logo-name">OA Événementiel</span>
              <span className="oah-logo-tagline">Événementiel · Location</span>
            </span>
          </Link>
        </div>

        <nav className="oah-right" aria-label="Accès rapides">
          {ICON_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`oah-icon${isCurrent(link.href) ? ' is-current' : ''}`}
              aria-label={link.label}
            >
              <Icon name={link.icon} />
              <span className="oah-tooltip" aria-hidden="true">{link.label}</span>
            </Link>
          ))}
          <Link
            href="/catalogue"
            className="oah-icon oah-icon-cart"
          >
            <Icon name="bag" />
            <span className="oah-cart-count" aria-hidden="true">{cartCount}</span>
            <span className="oah-tooltip" aria-hidden="true">Mon panier</span>
            <span className="visually-hidden">Mon panier{cartCount > 0 ? `, ${cartCount} article${cartCount > 1 ? 's' : ''}` : ''}</span>
          </Link>
        </nav>
      </div>

      <div
        className={`oah-overlay${menuOpen ? ' is-open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <div
        id="oah-drawer"
        className={`oah-drawer${menuOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <button
          ref={closeRef}
          type="button"
          className="oah-drawer-close"
          onClick={() => { setMenuOpen(false); toggleRef.current?.focus() }}
        >
          <Icon name="close" size={22} />
          <span>Fermer</span>
        </button>

        <nav className="oah-drawer-main" aria-label="Pages">
          {MAIN_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={`oah-drawer-link${isCurrent(link.href) ? ' is-current' : ''}`}
              style={{ '--i': i }}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
              {link.href === '/catalogue' && cartCount > 0 && (
                <span className="oah-drawer-badge">{cartCount}</span>
              )}
            </Link>
          ))}
        </nav>

        <nav className="oah-drawer-services" aria-label="Services">
          {SERVICE_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`oah-drawer-service${isCurrent(link.href) ? ' is-current' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}

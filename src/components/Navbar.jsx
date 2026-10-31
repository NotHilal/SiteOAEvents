import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getCatalogueCart, CART_EVENT } from '../lib/cart.js'
import Icon from './Icon.jsx'
import AccountMenu from './AccountMenu.jsx'
import ContactMenu from './ContactMenu.jsx'
import CartDrawer from './CartDrawer.jsx'
import { track } from '../lib/analytics.js'
import { SITE } from '../lib/site.js'

// Header modelled on options.fr (saved reference at /example): three equal
// columns — "Menu" drawer toggle + primary CTA on the left, a large centered
// logo that compacts on scroll, and a row of thin outline icons with tooltips
// on the right. Every page lives in the slide-in drawer rather than in a
// crowded inline link row.

// "Nous trouver" target: the Localisation block on the contact page.
const LOCATION_HREF = '/contact#localisation'

// Drawer contents: main pages as large uppercase lines, practical links as a
// smaller gold group beneath — same two-tier split as options.fr's menu.
const MAIN_LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/services', label: 'Prestations' },
  { href: '/catalogue', label: 'Catalogue' },
  { href: '/nos-realisations', label: 'Nos réalisations' },
  { href: '/a-propos', label: 'À Propos' },
]
const SERVICE_LINKS = [
  { href: '/reservation', label: 'Réserver' },
  { href: '/devis', label: 'Simulation de devis' },
  { href: '/suivi', label: 'Suivi de commande' },
  { href: '/contact', label: 'Contact' },
  // Also in the header icon row, which hides them below 992px.
  ...(SITE.phone ? [{ href: `tel:${SITE.phone}`, label: 'Nous appeler', external: true }] : []),
  { href: LOCATION_HREF, label: 'Nous trouver' },
]
// Right-hand icon row, in options.fr's order: phone (rendered separately as
// a dropdown), find us, contact, catalogue — then Mon compte and the cart.
// `current` marks the one icon whose page it is, so /contact doesn't light
// up multiple icons at once.
const ICON_LINKS = [
  { href: LOCATION_HREF, label: 'Nous trouver', icon: 'location' },
  { href: '/contact', label: 'Contactez-nous', icon: 'mail', current: true },
  { href: '/catalogue', label: 'Catalogue', icon: 'book', current: true },
]

export default function Navbar() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState({})
  const closeRef = useRef(null)
  const toggleRef = useRef(null)
  const cartCloseRef = useRef(null)
  const cartToggleRef = useRef(null)
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + (parseInt(quantity) || 0), 0)

  useEffect(() => {
    const sync = () => setCart(getCatalogueCart())
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

  // Close either drawer on route change.
  useEffect(() => {
    const close = () => { setMenuOpen(false); setCartOpen(false) }
    router.events.on('routeChangeStart', close)
    return () => router.events.off('routeChangeStart', close)
  }, [router.events])

  // Lock page scroll while either drawer is open, and let Escape close it.
  useEffect(() => {
    const drawerOpen = menuOpen || cartOpen
    document.documentElement.style.overflowY = drawerOpen ? 'hidden' : ''
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    // Lenis (see _app.jsx) scrolls via wheel/touch interception, so
    // overflow:hidden alone doesn't stop it — pause it explicitly too.
    if (drawerOpen) window.__lenis?.stop()
    else window.__lenis?.start()
    const onKey = e => {
      if (e.key !== 'Escape') return
      if (menuOpen) { setMenuOpen(false); toggleRef.current?.focus() }
      if (cartOpen) { setCartOpen(false); cartToggleRef.current?.focus() }
    }
    if (drawerOpen) {
      window.addEventListener('keydown', onKey)
      if (menuOpen) closeRef.current?.focus()
      else cartCloseRef.current?.focus()
    }
    return () => {
      document.documentElement.style.overflowY = ''; document.body.style.overflow = ''
      window.__lenis?.start()
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen, cartOpen])

  const isCurrent = href => router.pathname === href || (href === '/nos-realisations' && router.pathname === '/nos-realisations/[slug]')

  return (
    <header className={`oah${scrolled ? ' oah-scrolled' : ''}${menuOpen || cartOpen ? ' is-menu-open' : ''}`}>
      <div className="oah-bar">
        <div className="oah-left">
          <button
            type="button"
            ref={toggleRef}
            className="oah-menu-toggle"
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
            aria-controls="oah-drawer"
            onClick={() => { setCartOpen(false); setMenuOpen(true) }}
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
          <ContactMenu />
          {ICON_LINKS.map(link => {
            const Tag = link.external ? 'a' : Link
            return (
              <Tag
                key={link.label}
                href={link.href}
                {...(link.href === LOCATION_HREF && { scroll: false })}
                className={`oah-icon oah-icon-secondary${link.current && isCurrent(link.href) ? ' is-current' : ''}`}
                aria-label={link.label}
              >
                <Icon name={link.icon} ion size={32} />
                <span className="oah-tooltip" aria-hidden="true">{link.label}</span>
              </Tag>
            )
          })}
          <AccountMenu />
          <button
            ref={cartToggleRef}
            type="button"
            className="oah-icon oah-icon-cart"
            aria-label={`Mon panier${cartCount > 0 ? `, ${cartCount} article${cartCount > 1 ? 's' : ''}` : ''}`}
            aria-expanded={cartOpen}
            aria-controls="oah-cart-drawer"
            onClick={() => { setMenuOpen(false); setCartOpen(true) }}
          >
            <Icon name="cart" ion size={32} />
            <span className="oah-cart-count" aria-hidden="true">{cartCount}</span>
            <span className="oah-tooltip" aria-hidden="true">Mon panier</span>
          </button>
        </nav>
      </div>

      <div
        className={`oah-overlay${menuOpen || cartOpen ? ' is-open' : ''}`}
        onClick={() => { setMenuOpen(false); setCartOpen(false) }}
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
          {SERVICE_LINKS.map(link => {
            const Tag = link.external ? 'a' : Link
            return (
              <Tag
                key={link.href}
                href={link.href}
                {...(link.href === LOCATION_HREF && { scroll: false })}
                className={`oah-drawer-service${isCurrent(link.href) ? ' is-current' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Tag>
            )
          })}
        </nav>
      </div>
      <CartDrawer
        cart={cart}
        closeRef={cartCloseRef}
        onClose={() => { setCartOpen(false); cartToggleRef.current?.focus() }}
        open={cartOpen}
      />
    </header>
  )
}

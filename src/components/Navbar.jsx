import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getCatalogueCart, CART_EVENT, OPEN_CART_EVENT } from '../lib/cart.js'
import { getCategories } from '../lib/public-api.js'
import { catalogueCategoryHref } from './product/productUtils.js'
import Icon from './Icon.jsx'
import AccountMenu from './AccountMenu.jsx'
import ContactMenu from './ContactMenu.jsx'
import CartDrawer from './CartDrawer.jsx'
import { track } from '../lib/analytics.js'
import { SITE } from '../lib/site.js'

// "Nuit & or" header. At the top of the page it is a full-width ink bar:
// Menu + two quick links | gold monogram and serif wordmark | contact icons,
// account, cart and the Réserver button. Once scrolled, the same bar
// detaches into a compact floating pill (Menu | monogram | Réserver,
// account, cart) — the extras fold away rather than being re-rendered, so
// the transition is one continuous movement. Every page lives in the
// full-screen editorial menu.

// "Nous trouver" target: the occasions, zones and guides block on the homepage.
const LOCATION_HREF = '/#nous-trouver'

// Full-screen menu: each main page gets a photo that takes over the right
// half of the menu while its link is hovered or focused.
const MAIN_LINKS = [
  { href: '/', label: 'Accueil', image: '/videos/oa-hero-poster.jpg', caption: "Location de matériel événementiel dans toute la France" },
  { href: '/catalogue', label: 'Catalogue', image: '/catalogue/Tables_1200x670.jpg', caption: 'Location de mobilier et de décoration' },
  { href: '/evenements', label: 'Événements', image: '/pics/tables-rondes-sous-tente.jpg', caption: 'Le matériel à louer pour chaque occasion' },
  { href: '/nos-realisations', label: 'Nos réalisations', image: '/catalogue/Decorations_800x800.jpg', caption: 'Nos événements en images' },
  { href: '/a-propos', label: 'À Propos', image: '/catalogue/Chaises_600x800.jpg', caption: 'La maison OA Événementiel' },
]
const SERVICE_LINKS = [
  { href: '/commande', label: 'Mon panier' },
  { href: '/suivi', label: 'Suivi de commande' },
  { href: '/guides', label: 'Conseils' },
  { href: '/faq', label: 'Questions fréquentes' },
  { href: '/contact', label: 'Contact' },
  // Also in the header icon row, which hides them below 992px.
  ...(SITE.phone ? [{ href: `tel:${SITE.phone}`, label: 'Nous appeler', external: true }] : []),
  { href: LOCATION_HREF, label: 'Nous trouver' },
]
// Text links beside the Menu toggle in the full bar.
const QUICK_LINKS = [
  { href: '/evenements', label: 'Événements' },
  { href: '/nos-realisations', label: 'Réalisations' },
]
// Contact icons in the full bar (the phone dropdown, rendered separately,
// already offers e-mail and the contact form).
const ICON_LINKS = [
  { href: LOCATION_HREF, label: 'Nous trouver', icon: 'location' },
]

export default function Navbar() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // Menu photos are only requested once the menu has been opened.
  const [menuPrimed, setMenuPrimed] = useState(false)
  const [preview, setPreview] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState({})
  const closeRef = useRef(null)
  const toggleRef = useRef(null)
  const cartCloseRef = useRef(null)
  const cartToggleRef = useRef(null)
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + (parseInt(quantity) || 0), 0)
  // Catalogue strip under the bar: one link per category tile (Espace OA >
  // Catalogue), in their order.
  const [categories, setCategories] = useState([])
  useEffect(() => {
    getCategories().then(rows => setCategories(rows.map(c => ({ key: c.name, label: c.label }))))
  }, [])

  // Other components ask for the cart drawer ("Voir mon panier").
  useEffect(() => {
    const open = () => { setMenuOpen(false); setCartOpen(true) }
    window.addEventListener(OPEN_CART_EVENT, open)
    return () => window.removeEventListener(OPEN_CART_EVENT, open)
  }, [])

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

  // Close either panel on route change.
  useEffect(() => {
    const close = () => { setMenuOpen(false); setCartOpen(false) }
    router.events.on('routeChangeStart', close)
    return () => router.events.off('routeChangeStart', close)
  }, [router.events])

  // Lock page scroll while either panel is open, and let Escape close it.
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
  const currentIndex = Math.max(0, MAIN_LINKS.findIndex(link => isCurrent(link.href)))
  const shownIndex = preview ?? currentIndex

  const openMenu = () => {
    setCartOpen(false)
    setMenuPrimed(true)
    setPreview(null)
    setMenuOpen(true)
  }

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
            onClick={openMenu}
          >
            <span className="oah-burger" aria-hidden="true"><span /><span /></span>
            <span className="oah-menu-label">Menu</span>
          </button>
          <nav className="oah-fold oah-quick" aria-label="Accès directs">
            {QUICK_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`oah-quick-link${isCurrent(link.href) ? ' is-current' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="oah-center">
          <Link href="/" className="oah-logo" aria-label="OA Événementiel — accueil">
            <span className="oah-logo-mark" aria-hidden="true" />
            <span className="oah-logo-words oah-fold">
              <span className="oah-logo-name">OA Événementiel</span>
              <span className="oah-logo-tagline">Location · Toute la France</span>
            </span>
          </Link>
        </div>

        <div className="oah-right">
          <nav className="oah-fold oah-contact" aria-label="Nous contacter">
            <ContactMenu />
            {ICON_LINKS.map(link => (
              <Link
                key={link.label}
                href={link.href}
                {...(link.href === LOCATION_HREF && { scroll: false })}
                className="oah-icon oah-icon-secondary"
                aria-label={link.label}
              >
                <Icon name={link.icon} ion size={28} />
                <span className="oah-tooltip" aria-hidden="true">{link.label}</span>
              </Link>
            ))}
            <span className="oah-divider" aria-hidden="true" />
          </nav>
          <AccountMenu />
          {/* Takes the account's place in the floating pill (see style.css). */}
          <Link href="/catalogue" className={`oah-icon oah-icon-catalogue${isCurrent('/catalogue') ? ' is-current' : ''}`} aria-label="Catalogue">
            <Icon name="book" ion size={25} />
            <span className="oah-tooltip" aria-hidden="true">Catalogue</span>
          </Link>
          <button
            ref={cartToggleRef}
            type="button"
            className="oah-icon oah-icon-cart"
            aria-label={`Mon panier${cartCount > 0 ? `, ${cartCount} article${cartCount > 1 ? 's' : ''}` : ''}`}
            aria-expanded={cartOpen}
            aria-controls="oah-cart-drawer"
            onClick={() => { setMenuOpen(false); setCartOpen(true) }}
          >
            <Icon name="cart" ion size={29} />
            {cartCount > 0 && <span className="oah-cart-count" aria-hidden="true">{cartCount}</span>}
            <span className="oah-tooltip" aria-hidden="true">Mon panier</span>
          </button>
          <Link href="/catalogue/complet" className="oah-cta" onClick={() => track('Clic Réserver', { emplacement: 'header' })}>
            Réserver
          </Link>
        </div>
      </div>

      <nav className="oah-catbar" aria-label="Catalogue">
        <div className="oah-catbar-inner">
          <Link href="/catalogue/complet" className={`oah-catbar-all${router.pathname === '/catalogue/complet' ? ' is-current' : ''}`}>
            <i className="fas fa-th-large" aria-hidden="true" /> Tout le catalogue
          </Link>
          {categories.map(c => (
            <Link key={c.key} href={catalogueCategoryHref(c.key)} className={`oah-catbar-link${router.asPath.split('?')[0] === catalogueCategoryHref(c.key) ? ' is-current' : ''}`}>
              {c.label}
            </Link>
          ))}
          <Link href="/catalogue/complet" className="oah-catbar-book" onClick={() => track('Clic Réserver', { emplacement: 'barre catalogue' })}>
            <i className="far fa-calendar-check" aria-hidden="true" /> Réserver
          </Link>
        </div>
      </nav>

      <div
        className={`oah-overlay${cartOpen ? ' is-open' : ''}`}
        onClick={() => setCartOpen(false)}
        aria-hidden="true"
      />
      <div
        id="oah-drawer"
        className={`oah-drawer${menuOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!menuOpen}
      >
        <div className="oah-drawer-top">
          <button
            ref={closeRef}
            type="button"
            className="oah-drawer-close"
            onClick={() => { setMenuOpen(false); toggleRef.current?.focus() }}
          >
            <span className="oah-burger is-cross" aria-hidden="true"><span /><span /></span>
            <span>Fermer</span>
          </button>
          <Link href="/" className="oah-drawer-brand" onClick={() => setMenuOpen(false)}>
            <span className="oah-logo-mark" aria-hidden="true" />
            <span className="oah-logo-name">OA Événementiel</span>
          </Link>
          <Link href="/catalogue/complet" className="oah-cta" onClick={() => { setMenuOpen(false); track('Clic Réserver', { emplacement: 'menu' }) }}>
            Réserver
          </Link>
        </div>

        <div className="oah-drawer-body">
          <nav className="oah-drawer-main" aria-label="Pages" onPointerLeave={() => setPreview(null)}>
            {MAIN_LINKS.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                className={`oah-drawer-link${isCurrent(link.href) ? ' is-current' : ''}${shownIndex === i ? ' is-shown' : ''}`}
                style={{ '--i': i }}
                aria-current={isCurrent(link.href) ? 'page' : undefined}
                onPointerEnter={() => setPreview(i)}
                onFocus={() => setPreview(i)}
                onClick={() => setMenuOpen(false)}
              >
                <span className="oah-drawer-link-text">{link.label}</span>
                {link.href === '/catalogue' && cartCount > 0 && (
                  <span className="oah-drawer-badge" aria-label={`${cartCount} dans le panier`}>{cartCount}</span>
                )}
              </Link>
            ))}
          </nav>

          <figure className="oah-drawer-visual" aria-hidden="true">
            {menuPrimed && MAIN_LINKS.map((link, i) => (
              <img
                key={link.href}
                src={link.image}
                alt=""
                className={shownIndex === i ? 'is-shown' : ''}
                decoding="async"
              />
            ))}
            <figcaption>{MAIN_LINKS[shownIndex].caption}</figcaption>
          </figure>
        </div>

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
          <a href={`mailto:${SITE.email}`} className="oah-drawer-mail">{SITE.email}</a>
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

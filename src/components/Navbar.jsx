import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    document.body.classList.remove('offcanvas-menu')
  }, [location])

  const toggleMenu = () => {
    const next = !menuOpen
    setMenuOpen(next)
    document.body.classList.toggle('offcanvas-menu', next)
  }

  const isHome = location.pathname === '/'
  const isScrolled = scrolled || !isHome

  const isActive = (path) => {
    if (path === '#about') return false
    return location.pathname === path
  }

  const handleAbout = (e) => {
    e.preventDefault()
    if (isHome) {
      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      navigate('/')
      setTimeout(() => {
        document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 400)
    }
    setMenuOpen(false)
    document.body.classList.remove('offcanvas-menu')
  }

  const navLinks = [
    { to: '/', label: 'Accueil' },
    { to: '/services', label: 'Prestations' },
    { to: '/galerie', label: 'Galerie' },
    { to: '#about', label: 'À Propos', onClick: handleAbout },
    { to: '/contact', label: 'Contact' },
  ]

  return (
    <>
      <div className={`site-navbar-wrap js-site-navbar${isScrolled ? ' scrolled' : ''}`}>
        <div className="container">
          <div className="site-navbar">
            <div className="row align-items-center">
              <div className="col-4 col-lg-3">
                <h2 className="mb-0 site-logo">
                  <Link to="/">OA <span>Événementiel</span></Link>
                </h2>
              </div>
              <div className="col-8 col-lg-9">
                <nav className="site-navigation" role="navigation">
                  <ul className="site-menu js-clone-nav d-none d-lg-flex">
                    {navLinks.map(l => (
                      <li key={l.label} className={isActive(l.to) ? 'active' : ''}>
                        {l.onClick
                          ? <a href={l.to} onClick={l.onClick}>{l.label}</a>
                          : <Link to={l.to}>{l.label}</Link>
                        }
                      </li>
                    ))}
                    <li>
                      <Link to="/reservation" className="btn-devis">Réserver</Link>
                    </li>
                  </ul>
                  <div className="d-block d-lg-none text-right">
                    <button className="site-menu-toggle js-menu-toggle bg-transparent border-0 p-0" onClick={toggleMenu}>
                      <i className="fas fa-bars" />
                    </button>
                  </div>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="site-mobile-menu">
        <div className="site-mobile-menu-header">
          <div className="site-mobile-menu-logo">
            <Link to="/">OA <span>Événementiel</span></Link>
          </div>
          <div className="site-mobile-menu-close js-menu-toggle" onClick={toggleMenu}>
            <i className="fas fa-times" />
          </div>
        </div>
        <div className="site-mobile-menu-body">
          <ul className="site-nav-wrap">
            {navLinks.map(l => (
              <li key={l.label}>
                {l.onClick
                  ? <a href={l.to} onClick={l.onClick}>{l.label}</a>
                  : <Link to={l.to}>{l.label}</Link>
                }
              </li>
            ))}
            <li><Link to="/reservation">Réserver</Link></li>
          </ul>
        </div>
      </div>
    </>
  )
}

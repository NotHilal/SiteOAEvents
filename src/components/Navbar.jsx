import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Navbar() {
  const router = useRouter()
  const isHome = router.pathname === '/'

  return (
    <section className="main-header">
      <div className="w-layout-blockcontainer container w-container">
        <div className="header-main-box">
          <Link href="/" className={`header-logo-link w-inline-block ${isHome ? 'w--current' : ''}`}>
            {/* Remplacer "/LogoOA.png" par "/logo_template.avif" pour utiliser le logo du template */}
            <img
              loading="lazy"
              src="/LogoOA.png"
              alt="OA Événementiel Logo"
              className="header-logo"
              style={{ width: '130px', height: '35px', objectFit: 'contain' }}
            />
          </Link>
          <div className="header-menu-box">
            <Link
              href="/"
              data-w-id="120dca71-39d2-8c1e-9ed1-e619c73f2c8b"
              className={`header-menu-link w-inline-block ${router.pathname === '/' ? 'w--current' : ''}`}
            >
              <p className="header-menu-text">Accueil</p>
              <div className="header-menu-line"></div>
            </Link>
            <Link
              href="/services"
              data-w-id="120dca71-39d2-8c1e-9ed1-e619c73f2c8e"
              className={`header-menu-link w-inline-block ${router.pathname === '/services' ? 'w--current' : ''}`}
            >
              <p className="header-menu-text">Prestations</p>
              <div className="header-menu-line"></div>
            </Link>
            <Link
              href="/galerie"
              data-w-id="120dca71-39d2-8c1e-9ed1-e619c73f2c91"
              className={`header-menu-link w-inline-block ${router.pathname === '/galerie' ? 'w--current' : ''}`}
            >
              <p className="header-menu-text">Galerie</p>
              <div className="header-menu-line"></div>
            </Link>
            <Link
              href="/devis"
              className={`header-menu-link w-inline-block ${router.pathname === '/devis' ? 'w--current' : ''}`}
            >
              <p className="header-menu-text">Simulation de Devis</p>
              <div className="header-menu-line"></div>
            </Link>
            <Link
              href="/suivi"
              className={`header-menu-link w-inline-block ${router.pathname === '/suivi' ? 'w--current' : ''}`}
            >
              <p className="header-menu-text">Suivi de commande</p>
              <div className="header-menu-line"></div>
            </Link>
            <Link
              href="/a-propos"
              data-w-id="120dca71-39d2-8c1e-9ed1-e619c73f2c94"
              className={`header-menu-link w-inline-block ${router.pathname === '/a-propos' ? 'w--current' : ''}`}
            >
              <p className="header-menu-text">À Propos</p>
              <div className="header-menu-line"></div>
            </Link>
            <Link
              href="/contact"
              data-w-id="120dca71-39d2-8c1e-9ed1-e619c73f2c97"
              className={`header-menu-link w-inline-block ${router.pathname === '/contact' ? 'w--current' : ''}`}
            >
              <p className="header-menu-text">Contact</p>
              <div className="header-menu-line"></div>
            </Link>
          </div>
          
          <div className="header-btn-box">
            <div className="header-btn">
              <Link href="/espace-oa" className="theme-button theme-button-outline w-inline-block">
                <div className="theme-button-content">
                  <div className="theme-button-text">Espace OA</div>
                  <div className="theme-button-hover-text">Espace OA</div>
                </div>
              </Link>
            </div>
            <div className="header-btn">
              <Link
                href="/reservation"
                data-wf--primary-button--variant="base"
                data-w-id="08c8af99-e448-a937-dcfa-7ee6c8bdc474"
                className="theme-button w-inline-block"
              >
                <div className="theme-button-content">
                  <div className="theme-button-text">Réserver</div>
                  <div className="theme-button-hover-text">Réserver</div>
                </div>
              </Link>
            </div>
            <div data-w-id="120dca71-39d2-8c1e-9ed1-e619c73f2ca3" className="mobile-menu-btn">
              
            </div>
          </div>
        </div>
      </div>
      
      {/* Native Webflow Mobile Menu - Managed by Webflow JS via ID Triggers */}
      <div className="mobile-menu">
        <div className="mobile-logo-box">
          <Link href="/" className={`header-logo-link w-inline-block ${isHome ? 'w--current' : ''}`}>
            {/* Remplacer "/LogoOA.png" par "/logo_template.avif" pour utiliser le logo du template */}
            <img
              loading="lazy"
              src="/LogoOA.png"
              alt="OA Événementiel Logo"
              className="header-logo"
              style={{ width: '110px', height: '30px', objectFit: 'contain' }}
            />
          </Link>
          <img
            data-w-id="c6458aca-98af-15a7-c01c-17afce9b98cf"
            loading="lazy"
            alt="Close Menu"
            src="https://cdn.prod.website-files.com/686b79afb668ce59a9047b8f/694e428401e8e79a23001a0a_679274e26348659b0fc56c38_close.png"
            className="mobile-menu-close-btn"
          />
        </div>
        <div className="mobile-menu-box">
          <Link
            href="/"
            data-w-id="c6458aca-98af-15a7-c01c-17afce9b98d1"
            className={`mobile-dropdown-link w-inline-block ${router.pathname === '/' ? 'w--current' : ''}`}
          >
            <div className="mobile-dropdown-title">Accueil</div>
          </Link>
          <Link
            href="/services"
            data-w-id="c6458aca-98af-15a7-c01c-17afce9b98d4"
            className={`mobile-dropdown-link w-inline-block ${router.pathname === '/services' ? 'w--current' : ''}`}
          >
            <div className="mobile-dropdown-title">Prestations</div>
          </Link>
          <Link
            href="/galerie"
            data-w-id="c6458aca-98af-15a7-c01c-17afce9b98d7"
            className={`mobile-dropdown-link w-inline-block ${router.pathname === '/galerie' ? 'w--current' : ''}`}
          >
            <div className="mobile-dropdown-title">Galerie</div>
          </Link>
          <Link
            href="/devis"
            className={`mobile-dropdown-link w-inline-block ${router.pathname === '/devis' ? 'w--current' : ''}`}
          >
            <div className="mobile-dropdown-title">Simulation de Devis</div>
          </Link>
          <Link
            href="/suivi"
            className={`mobile-dropdown-link w-inline-block ${router.pathname === '/suivi' ? 'w--current' : ''}`}
          >
            <div className="mobile-dropdown-title">Suivi de commande</div>
          </Link>
          <Link
            href="/a-propos"
            data-w-id="c6458aca-98af-15a7-c01c-17afce9b98dd"
            className={`mobile-dropdown-link w-inline-block ${router.pathname === '/a-propos' ? 'w--current' : ''}`}
          >
            <div className="mobile-dropdown-title">À Propos</div>
          </Link>
          <Link
            href="/contact"
            data-w-id="c6458aca-98af-15a7-c01c-17afce9b98da"
            className={`mobile-dropdown-link w-inline-block ${router.pathname === '/contact' ? 'w--current' : ''}`}
          >
            <div className="mobile-dropdown-title">Contact</div>
          </Link>
          
          <Link
            href="/espace-oa"
            className="theme-button theme-button-outline w-inline-block"
            style={{ marginTop: '20px', width: '100%', textAlign: 'center' }}
          >
            <div className="theme-button-content" style={{ justifyContent: 'center' }}>
              <div className="theme-button-text">Espace OA</div>
            </div>
          </Link>
          <Link
            href="/reservation"
            data-wf--primary-button--variant="base"
            data-w-id="08c8af99-e448-a937-dcfa-7ee6c8bdc474"
            className="theme-button w-inline-block"
            style={{ marginTop: '10px', width: '100%', textAlign: 'center' }}
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

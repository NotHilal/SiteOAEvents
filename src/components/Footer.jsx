import Link from 'next/link'

export default function Footer() {
  return (
    <footer data-wf--main-footer--variant="base" className="main-footer">
      <span className="footer-corner footer-corner-tl" aria-hidden="true" />
      <span className="footer-corner footer-corner-tr" aria-hidden="true" />
      <span className="footer-corner footer-corner-bl" aria-hidden="true" />
      <span className="footer-corner footer-corner-br" aria-hidden="true" />
      <div className="footer-widgets-section">
        <div className="w-layout-blockcontainer container-small w-container">
          <div className="footer-cols">
            <div className="footer-brand-col">
              <Link href="/" className="footer-logo-link w-inline-block">
                <img
                  loading="lazy"
                  src="/LogoOA.png"
                  alt="OA Événementiel Logo"
                  className="footer-logo"
                  style={{ maxHeight: '48px', objectFit: 'contain' }}
                />
              </Link>
              <p className="footer-text">
                Organisation et scénographie d'événements sur-mesure en Île-de-France.
              </p>
              <div className="social-list">
                <a href="#!" aria-label="Facebook" className="social-list-item w-inline-block">
                  <i className="fab fa-facebook-f" />
                </a>
                <a href="#!" aria-label="Instagram" className="social-list-item w-inline-block">
                  <i className="fab fa-instagram" />
                </a>
                <a href="#!" aria-label="Pinterest" className="social-list-item w-inline-block">
                  <i className="fab fa-pinterest-p" />
                </a>
              </div>
            </div>

            <div className="footer-widget">
              <h5 className="footer-widget-title">Navigation</h5>
              <ul role="list" className="list-style-one">
                <li className="list-item"><Link href="/" className="list-text-link">Accueil</Link></li>
                <li className="list-item"><Link href="/services" className="list-text-link">Prestations</Link></li>
                <li className="list-item"><Link href="/galerie" className="list-text-link">Galerie</Link></li>
                <li className="list-item"><Link href="/suivi" className="list-text-link">Suivi de commande</Link></li>
                <li className="list-item"><Link href="/contact" className="list-text-link">Contact</Link></li>
              </ul>
            </div>

            <div className="footer-widget">
              <h5 className="footer-widget-title">Contact</h5>
              <ul role="list" className="list-style-one">
                <li className="list-item footer-contact-line">
                  <i className="fas fa-map-marker-alt" /> Île-de-France, France
                </li>
                <li className="list-item footer-contact-line">
                  <i className="fas fa-envelope" /> contact@oa-evenementiel.fr
                </li>
                <li className="list-item">
                  <Link href="/reservation" className="list-text-link footer-cta-link">
                    Demander un devis →
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="w-layout-blockcontainer container w-container">
          <div className="footer-bottom-inner-box">
            <p className="footer-copyright-text">
              © {new Date().getFullYear()} OA Événementiel — Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

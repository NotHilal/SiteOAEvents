import Link from 'next/link'

export default function Footer() {
  return (
    <footer data-wf--main-footer--variant="base" className="main-footer">
      <div className="footer-widgets-section">
        <div className="w-layout-blockcontainer container-small w-container">
          <div className="w-layout-grid footer-grid">
            <div className="footer-widget">
              <Link href="/" className="footer-logo-link w-inline-block">
                <img
                  loading="lazy"
                  src="/LogoOA.png"
                  alt="OA Événementiel Logo"
                  className="footer-logo"
                  style={{ maxHeight: '60px', objectFit: 'contain' }}
                />
              </Link>
              <p className="footer-text">
                Votre organisatrice d'événements passionnée, pour des moments inoubliables en Île-de-France. Mariages, anniversaires, événements professionnels et location de décoration.
              </p>
              <div className="footer-social-link-outer">
                <p className="footer-social-text">Suivez-nous :</p>
                <div className="social-list">
                  <a href="#!" aria-label="Facebook" className="social-list-item w-inline-block">
                    <p className="social-icon"><i className="fab fa-facebook-f" /></p>
                  </a>
                  <a href="#!" aria-label="Instagram" className="social-list-item w-inline-block">
                    <p className="social-icon"><i className="fab fa-instagram" /></p>
                  </a>
                  <a href="#!" aria-label="Pinterest" className="social-list-item w-inline-block">
                    <p className="social-icon"><i className="fab fa-pinterest-p" /></p>
                  </a>
                </div>
              </div>
            </div>
            
            <div className="footer-widget-outer">
              <div className="footer-widget">
                <h5 className="footer-widget-title">Navigation</h5>
                <ul role="list" className="list-style-one">
                  <li className="list-item">
                    <Link href="/" className="list-text-link">Accueil</Link>
                  </li>
                  <li className="list-item">
                    <Link href="/services" className="list-text-link">Prestations</Link>
                  </li>
                  <li className="list-item">
                    <Link href="/galerie" className="list-text-link">Galerie</Link>
                  </li>
                  <li className="list-item">
                    <Link href="/contact" className="list-text-link">Contact</Link>
                  </li>
                  <li className="list-item">
                    <Link href="/suivi" className="list-text-link">Suivre ma demande</Link>
                  </li>
                </ul>
              </div>

              <div className="footer-widget">
                <h5 className="footer-widget-title">Prestations</h5>
                <ul role="list" className="list-style-one">
                  <li className="list-item">
                    <Link href="/services" className="list-text-link">Organisation Mariage</Link>
                  </li>
                  <li className="list-item">
                    <Link href="/services" className="list-text-link">Organisation Anniversaire</Link>
                  </li>
                  <li className="list-item">
                    <Link href="/services" className="list-text-link">Événements Pro</Link>
                  </li>
                  <li className="list-item">
                    <Link href="/services" className="list-text-link">Location Décoration</Link>
                  </li>
                </ul>
              </div>

              <div className="footer-widget">
                <h5 className="footer-widget-title">Contact</h5>
                <ul role="list" className="list-style-one">
                  <li className="list-item" style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                    <i className="fas fa-map-marker-alt" style={{ marginRight: '8px' }} /> Île-de-France, France
                  </li>
                  <li className="list-item" style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                    <i className="fas fa-envelope" style={{ marginRight: '8px' }} /> contact@oa-evenementiel.fr
                  </li>
                  <li className="list-item">
                    <Link href="/reservation" className="list-text-link" style={{ fontWeight: 'bold' }}>
                      Demander un devis →
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="w-layout-blockcontainer container w-container">
          <div className="footer-bottom-inner-box">
            <p className="footer-copyright-text" style={{ margin: 0 }}>
              © {new Date().getFullYear()} - 
              <Link href="/" className="footer-copyright-text-link" style={{ marginLeft: '4px' }}>OA Événementiel</Link>
              {' '} | Fait avec ♥ pour des moments d'exceptions.
            </p>
            <div className="footer-shape"></div>
            <div className="footer-shape two"></div>
          </div>
        </div>
      </div>
    </footer>
  )
}

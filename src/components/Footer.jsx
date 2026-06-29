import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="row">
          <div className="col-lg-4 mb-5 mb-lg-0">
            <div className="footer-logo">OA<span>.</span></div>
            <p>Votre organisatrice d'événements passionnée, pour des moments inoubliables en Île-de-France. Mariages, anniversaires, événements professionnels et location de décoration.</p>
            <div className="footer-social">
              <a href="#!" aria-label="Instagram"><i className="fab fa-instagram" /></a>
              <a href="#!" aria-label="Facebook"><i className="fab fa-facebook-f" /></a>
              <a href="#!" aria-label="Pinterest"><i className="fab fa-pinterest-p" /></a>
            </div>
          </div>

          <div className="col-lg-2 col-6 mb-5 mb-lg-0">
            <h3 className="footer-heading">Navigation</h3>
            <ul className="footer-links">
              <li><Link to="/">Accueil</Link></li>
              <li><Link to="/services">Prestations</Link></li>
              <li><Link to="/galerie">Galerie</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/reservation">Réservation</Link></li>
            </ul>
          </div>

          <div className="col-lg-3 col-6 mb-5 mb-lg-0">
            <h3 className="footer-heading">Prestations</h3>
            <ul className="footer-links">
              <li><Link to="/services">Organisation Mariage</Link></li>
              <li><Link to="/services">Organisation Anniversaire</Link></li>
              <li><Link to="/services">Événements Pro</Link></li>
              <li><Link to="/services">Location Décoration</Link></li>
            </ul>
          </div>

          <div className="col-lg-3 mb-5 mb-lg-0">
            <h3 className="footer-heading">Contact</h3>
            <ul className="footer-contact-list">
              <li><i className="fas fa-map-marker-alt" /><span>Île-de-France, France</span></li>
              <li><i className="fas fa-phone" /><span>Sur demande</span></li>
              <li><i className="fas fa-envelope" /><span>contact@oa-evenementiel.fr</span></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} OA Événementiel. Tous droits réservés.</p>
          <p>Fait avec <span style={{color:'var(--rose-gold)'}}>♥</span></p>
        </div>
      </div>
    </footer>
  )
}

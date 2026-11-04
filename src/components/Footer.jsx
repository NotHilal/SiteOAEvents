import Link from 'next/link'
import { openCookieSettings } from '../lib/consent.js'
import { SITE } from '../lib/site.js'
import { CATEGORY_SEO } from '../lib/seo/catalogue.js'
import { EVENTS } from '../lib/seo/landings.js'

const SOCIALS = [
  { key: 'facebook', label: 'Facebook', icon: 'fab fa-facebook-f' },
  { key: 'instagram', label: 'Instagram', icon: 'fab fa-instagram' },
  { key: 'pinterest', label: 'Pinterest', icon: 'fab fa-pinterest-p' },
].map(s => ({ ...s, url: SITE.social?.[s.key] })).filter(s => s.url)

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
                {/* Transparent version of the logo — medias/logo-oa.png has the marble
                    background baked into the image. */}
                <img
                  loading="lazy"
                  src="/logo-mark-h336.webp"
                  alt="OA Événementiel — Événementiel, location"
                  className="footer-logo"
                  width="313"
                  height="336"
                />
              </Link>
              <p className="footer-text">
                Location de matériel événementiel dans toute la France : tentes, mobilier, vaisselle et décoration, livrés et installés.
              </p>
              {/* Social icons pointed to "#!" (dead links). They render again
                  as soon as real profile URLs are filled in SITE.social
                  (src/lib/site.js). */}
              {SOCIALS.length > 0 && (
                <div className="social-list">
                  {SOCIALS.map(s => (
                    <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="social-list-item w-inline-block">
                      <i className={s.icon} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="footer-widget footer-nav-widget">
              <h2 className="footer-widget-title footer-nav-title">Navigation</h2>
              <div className="footer-nav-two-col">
                <ul role="list" className="list-style-one">
                  <li className="list-item"><Link href="/" className="list-text-link">Accueil</Link></li>
                  <li className="list-item"><Link href="/nos-realisations" className="list-text-link">Nos réalisations</Link></li>
                  <li className="list-item"><Link href="/catalogue" className="list-text-link">Réserver</Link></li>
                </ul>
                <ul role="list" className="list-style-one">
                  <li className="list-item"><Link href="/suivi" className="list-text-link">Suivi de commande</Link></li>
                  <li className="list-item"><Link href="/a-propos" className="list-text-link">À Propos</Link></li>
                  <li className="list-item"><Link href="/contact" className="list-text-link">Contact</Link></li>
                </ul>
              </div>
            </div>

            <div className="footer-widget">
              <h2 className="footer-widget-title">Contact</h2>
              <ul role="list" className="list-style-one">
                <li className="list-item footer-contact-line">
                  <i className="fas fa-map-marker-alt" aria-hidden="true" /> {SITE.address.street}, {SITE.address.postalCode} {SITE.address.city}
                </li>
                {SITE.phone && (
                  <li className="list-item footer-contact-line">
                    <i className="fas fa-phone" aria-hidden="true" /> <a href={`tel:${SITE.phone}`} className="list-text-link">{SITE.phone}</a>
                  </li>
                )}
                <li className="list-item footer-contact-line">
                  <i className="fas fa-envelope" aria-hidden="true" /> <a href={`mailto:${SITE.email}`} className="list-text-link">{SITE.email}</a>
                </li>
                <li className="list-item">
                  <Link href="/catalogue" className="list-text-link footer-cta-link">
                    Demander un devis →
                  </Link>
                </li>
              </ul>
            </div>

            <div className="footer-widget footer-legal-widget">
              <h2 className="footer-widget-title">Informations légales</h2>
              <ul role="list" className="list-style-one">
                <li className="list-item"><Link href="/mentions-legales" className="list-text-link">Mentions légales</Link></li>
                <li className="list-item"><Link href="/cgv" className="list-text-link">Conditions de vente &amp; location (CGV)</Link></li>
                <li className="list-item"><Link href="/cgu" className="list-text-link">Conditions d'utilisation (CGU)</Link></li>
                <li className="list-item"><Link href="/confidentialite" className="list-text-link">Politique de confidentialité</Link></li>
                <li className="list-item"><Link href="/cookies" className="list-text-link">Politique des cookies</Link></li>
                <li className="list-item"><Link href="/retractation" className="list-text-link">Formulaire de rétractation</Link></li>
                <li className="list-item">
                  <button type="button" className="list-text-link footer-cookie-btn" onClick={openCookieSettings}>Gestion des cookies</button>
                </li>
              </ul>
            </div>
          </div>
          {/* Crawlable links to the catalogue, zone and occasion pages. */}
          <nav className="footer-seo" aria-label="Location de matériel">
            <div>
              <h2 className="footer-widget-title">Matériel à louer</h2>
              <ul role="list">
                {Object.entries(CATEGORY_SEO).map(([slug, c]) => (
                  <li key={slug}><Link href={`/location/${slug}`} className="list-text-link">{c.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="footer-widget-title">Livraison</h2>
              <ul role="list">
                <li className="list-text-link" style={{ color: 'var(--oah-ivory)', fontWeight: 600 }}>
                  TOUTE la France
                </li>
                <li style={{ marginTop: '8px', color: 'var(--oa-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  Livraison et installation 7j/7 partout en France métropolitaine.
                </li>
                <li style={{ marginTop: '10px' }}>
                  <Link href="/catalogue/complet" className="list-text-link">Voir le catalogue complet →</Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="footer-widget-title">Votre événement</h2>
              <ul role="list">
                {EVENTS.map(e => (
                  <li key={e.slug}><Link href={`/evenements/${e.slug}`} className="list-text-link">{e.name}</Link></li>
                ))}
                <li><Link href="/guides" className="list-text-link">Conseils</Link></li>
                <li><Link href="/faq" className="list-text-link">Questions fréquentes</Link></li>
              </ul>
            </div>
          </nav>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="w-layout-blockcontainer container w-container">
          <div className="footer-bottom-inner-box">
            <p className="footer-copyright-text">
              <Link href="/admin" prefetch={false} className="footer-copyright-link">
                © {new Date().getFullYear()} OA Événementiel — Tous droits réservés.
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

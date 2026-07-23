import Link from 'next/link'
import Head from 'next/head'

// Placeholder content — everything in brackets [...] and the stat numbers
// below are mockups to be swapped for the real story, figures and photo.
// See the "MOCKUP" comments for exactly what to replace.

export default function APropos() {
  return (
    <>
      <Head>
        <title>À Propos — OA Événementiel</title>
        <meta name="description" content="Découvrez OA Événementiel, organisation et scénographie d'événements sur-mesure en Île-de-France." />
      </Head>

      <div className="site-wrap">
        <div
          className="page-header"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1920&q=80)' }}
        >
          <div className="page-header-overlay" />
          <div className="container">
            <h1>À Propos</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb justify-content-center">
                <li className="breadcrumb-item"><Link href="/">Accueil</Link></li>
                <li className="breadcrumb-item active">À Propos</li>
              </ol>
            </nav>
          </div>
        </div>

        {/* QUI SOMMES-NOUS — MOCKUP: remplacer le texte et la photo par les vrais */}
        <section className="why-choose-us pb-zero">
          <div className="why-us-outer">
            <div className="w-layout-blockcontainer container-small w-container">
              <div className="w-layout-grid why-us-grid">

                <div className="why-us-content-box">
                  <div className="section-title-box why-us-title-box">
                    <div className="section-subtitle-box">
                      <div className="section-subtitle-icon"></div>
                      <p className="section-subtitle">Qui sommes-nous</p>
                    </div>
                    <h2 className="section-title">[Prénom Nom], fondateur d'OA Événementiel</h2>
                    <p className="section-text">
                      [Votre histoire ici — pourquoi ce métier vous anime, depuis quand vous organisez des événements,
                      ce qui rend votre approche différente. Deux ou trois phrases suffisent, je les mettrai en forme.]
                    </p>
                  </div>
                  <div className="why-us-counter-outer">
                    <div className="counter-block">
                      <h2 className="counter-count">[X]+</h2>
                      <div className="counter-title-box">
                        <div className="counter-dot"></div>
                        <p className="counter-title">[Ex : Ans d'expérience]</p>
                      </div>
                    </div>
                    <div className="counter-block">
                      <h2 className="counter-count">[X]+</h2>
                      <div className="counter-title-box">
                        <div className="counter-dot"></div>
                        <p className="counter-title">[Ex : Événements réalisés]</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="why-us-image-box">
                  <div className="apropos-photo-placeholder">
                    <i className="fas fa-camera" />
                    <p>Votre photo ici</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* NOS VALEURS — MOCKUP: à ajuster selon ce que vous voulez mettre en avant */}
        <section className="feature-section">
          <div className="w-layout-blockcontainer container w-container">
            <div className="section-title-box" style={{ textAlign: 'center', marginBottom: 40 }}>
              <div className="section-subtitle-box" style={{ justifyContent: 'center' }}>
                <div className="section-subtitle-icon"></div>
                <p className="section-subtitle">Nos valeurs</p>
              </div>
              <h2 className="section-title">Ce qui guide chaque projet</h2>
            </div>
            <div className="w-layout-grid feature-grid">

              <div className="feature-block">
                <img src="/return.avif" loading="lazy" alt="" className="feature-icon" />
                <h4 style={{ color: 'rgb(0,0,0)' }} className="feature-title">[Créativité sur-mesure]</h4>
                <p style={{ color: 'rgb(0,0,0)' }} className="feature-text">[Description à personnaliser.]</p>
              </div>

              <div className="feature-block">
                <img src="/delivery-truck.avif" loading="lazy" alt="" className="feature-icon" />
                <h4 style={{ color: 'rgb(0,0,0)' }} className="feature-title">[Logistique maîtrisée]</h4>
                <p style={{ color: 'rgb(0,0,0)' }} className="feature-text">[Description à personnaliser.]</p>
              </div>

              <div className="feature-block">
                <img src="/customer-service.avif" loading="lazy" alt="" className="feature-icon" />
                <h4 style={{ color: 'rgb(0,0,0)' }} className="feature-title">[Écoute & Accompagnement]</h4>
                <p style={{ color: 'rgb(0,0,0)' }} className="feature-text">[Description à personnaliser.]</p>
              </div>

              <div className="feature-block">
                <img src="/money-back.avif" loading="lazy" alt="" className="feature-icon" />
                <h4 style={{ color: 'rgb(0,0,0)' }} className="feature-title">[Confiance & Transparence]</h4>
                <p style={{ color: 'rgb(0,0,0)' }} className="feature-text">[Description à personnaliser.]</p>
              </div>

            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="apropos-cta-section">
          <div className="container">
            <h2 className="apropos-cta-title">Discutons de votre événement</h2>
            <p className="apropos-cta-text">Parlons de votre projet et voyons comment lui donner vie ensemble.</p>
            <Link href="/reservation" className="btn btn-rose-gold">Demander un devis</Link>
          </div>
        </section>
      </div>
    </>
  )
}

import { useEffect } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import AOS from 'aos'

const PAGE_HEADER_DEFAULT = 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1920&q=80'

// Curated "real event" stories rather than a plain photo grid — the point is
// letting a visitor picture their own day, so each entry gets a short
// narrative and a few concrete highlights instead of just an image. Photos
// reused from the site's existing, already-verified Unsplash set (same URLs
// used in pages/galerie.jsx and pages/index.jsx) rather than new unverified
// ones. `video` is left undefined on every entry for now — no real footage
// exists yet — but the block below already renders one if a future entry
// sets it, so swapping in real video later is a data change, not a rebuild.
const EXPERIENCES = [
  {
    title: 'Camille & Julien',
    tag: 'Mariage champêtre — Juin 2025',
    img: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1000&q=80',
    video: null,
    text: "Un mariage en extérieur pensé comme une promenade : chapiteau ouvert sur le jardin, tables en bois brut et une scénographie florale du cocktail jusqu'au dernier slow. Chaque prestataire coordonné pour que les mariés n'aient rien à gérer le jour J.",
    highlights: ['180 invités', 'Chapiteau + jardin', 'Scénographie florale', 'Coordination jour J'],
  },
  {
    title: 'Nadia & Rémi',
    tag: 'Mariage élégant — Septembre 2025',
    img: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1000&q=80',
    video: null,
    text: "Une réception en salle avec une direction artistique tout en tons neutres et dorés — art de la table complet, jeux de lumière et un plan de table pensé au millimètre pour 220 convives, sans un accroc.",
    highlights: ['220 invités', 'Salle de réception', 'Art de la table', 'Éclairage sur mesure'],
  },
  {
    title: 'Camille R.',
    tag: 'Mariage intime — Mai 2025',
    img: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1000&q=80',
    video: null,
    text: "Une cérémonie à taille humaine, 40 proches seulement, où chaque détail — du bouquet à la vaisselle — a été choisi avec les mariés pour raconter leur histoire plutôt que suivre une tendance.",
    highlights: ['40 invités', 'Cérémonie laïque', 'Décoration sur mesure'],
  },
  {
    title: 'Isabelle M.',
    tag: 'Anniversaire — 50 ans',
    img: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1000&q=80',
    video: null,
    text: "Une soirée surprise transformée en véritable événement : thème choisi avec la famille, animation, traiteur et une scénographie qui a surpris jusqu'à la fêtée elle-même.",
    highlights: ['80 invités', 'Soirée à thème', 'Animation & traiteur'],
  },
  {
    title: 'Thomas R.',
    tag: "Séminaire d'entreprise — Corporate",
    img: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1000&q=80',
    video: null,
    text: "Un séminaire de deux jours avec logistique complète — salle plénière, ateliers, restauration et soirée de clôture — livré clé en main pour que l'équipe organisatrice reste concentrée sur le contenu.",
    highlights: ['120 participants', 'Logistique complète', 'Soirée de clôture'],
  },
]

export default function NosExperiences() {
  useEffect(() => {
    AOS.init({ duration: 820, easing: 'ease-in-out', once: true, offset: 55 })
    AOS.refresh()
  }, [])

  return (
    <>
      <Head>
        <title>Nos Expériences — OA Événementiel</title>
        <meta name="description" content="Découvrez plusieurs mariages, anniversaires et événements professionnels réalisés par OA Événementiel — histoires, ambiances et coulisses." />
      </Head>

      <div className="site-wrap">
        <div className="page-header" style={{ backgroundImage: `url(${PAGE_HEADER_DEFAULT})` }}>
          <div className="page-header-overlay" />
          <div className="container">
            <h1>Nos Expériences</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb justify-content-center">
                <li className="breadcrumb-item"><Link href="/">Accueil</Link></li>
                <li className="breadcrumb-item active">Nos Expériences</li>
              </ol>
            </nav>
          </div>
        </div>

        <section className="services-full-section">
          <div className="container">
            <div className="oa-section-head" data-aos="fade-up" style={{ marginBottom: 50 }}>
              <span className="oa-eyebrow">Ils nous ont fait confiance</span>
              <h2 className="oa-heading" style={{ fontSize: 'var(--oa-size-h1)' }}>Quelques-unes de leurs journées</h2>
              <p className="oa-text-muted" style={{ maxWidth: 620, margin: '10px auto 0' }}>
                Chaque événement est différent — voici un aperçu de ce que nous avons imaginé pour eux, pour vous aider à vous projeter dans le vôtre.
              </p>
            </div>

            {EXPERIENCES.map((e, i) => (
              <div key={e.title} className="service-block">
                <div className={`row align-items-center${i % 2 === 1 ? ' flex-row-reverse' : ''}`}>
                  <div className="col-lg-6 mb-4 mb-lg-0" data-aos={i % 2 === 1 ? 'fade-left' : 'fade-right'}>
                    <div className="oa-experience-media">
                      {e.video ? (
                        <video src={e.video} poster={e.img} controls playsInline className="service-block-image" />
                      ) : (
                        <img src={e.img} alt={e.title} className="service-block-image" />
                      )}
                    </div>
                  </div>
                  <div className={`col-lg-6 ${i % 2 === 1 ? 'pe-lg-5' : 'ps-lg-5'}`} data-aos={i % 2 === 1 ? 'fade-right' : 'fade-left'} data-aos-delay="100">
                    <span className="devis-tag">{e.tag}</span>
                    <h2>{e.title}</h2>
                    <p className="section-text">{e.text}</p>
                    <ul className="service-includes">
                      {e.highlights.map((h, j) => <li key={j}>{h}</li>)}
                    </ul>
                    <Link href="/reservation" className="btn btn-rose-gold">Vivre une expérience similaire</Link>
                  </div>
                </div>
              </div>
            ))}

            <div className="oa-center-cta" data-aos="fade-up">
              <Link href="/galerie" className="theme-button theme-button-outline w-inline-block">
                <div className="theme-button-content"><div className="theme-button-text">Voir toute la galerie</div></div>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

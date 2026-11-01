import { useEffect, useState } from 'react'
import Link from 'next/link'
import Seo from '../src/components/Seo.jsx'
import { getContent } from '../src/lib/public-api.js'
import { SITE } from '../src/lib/site.js'

// Fixed icons for the "Nos valeurs" blocks — same 4 icons reused on the
// homepage's "Pourquoi OA" section. Only the title/text come from the DB.
const VALUE_ICONS = ['/return.avif', '/delivery-truck.avif', '/customer-service.avif', '/money-back.avif']

// Matches the seed row in src/lib/db/seed.js — used as the initial state
// so there's no flash of empty content before the fetch resolves.
const PAGE_HEADER_DEFAULT = 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=75&auto=format&fit=crop'

const DEFAULT_CONTENT = {
  headline: "Location et décoration d'événements en Île-de-France",
  story: "OA Événementiel est née en 2026 d'une conviction simple : chaque réception mérite un décor à la hauteur de ce qu'elle célèbre. Installée à Chanteloup-les-Vignes, dans les Yvelines, l'entreprise accompagne particuliers et professionnels partout en Île-de-France.\n\nMariages, anniversaires, baptêmes, séminaires ou soirées d'entreprise : nous louons le mobilier, la vaisselle et la décoration de vos événements, et nous pouvons aussi les imaginer, les coordonner et les installer de A à Z. Vous composez votre sélection en ligne, nous livrons, montons et reprenons le matériel.\n\nUne question, un projet ? Écrivez-nous à contact@oa-evenementiel.fr, nous vous répondons rapidement.",
  photoUrl: null,
  headerImg: null,
  counters: [
    { count: "2026", label: "Année de création" },
    { count: "7j/7", label: "À votre écoute" },
  ],
  values: [
    { title: "Créativité sur-mesure", text: "Chaque décor est pensé pour votre événement : vos couleurs, votre lieu, votre style. Nous composons avec vous une ambiance qui vous ressemble." },
    { title: "Logistique maîtrisée", text: "Livraison, montage, démontage et reprise du matériel : nous organisons chaque étape pour que le jour J se déroule sans imprévu." },
    { title: "Écoute & Accompagnement", text: "Du premier échange à la fin de l'événement, un interlocuteur unique vous conseille et répond à vos questions." },
    { title: "Confiance & Transparence", text: "Des prix affichés en ligne et un total calculé avant de commander, livraison comprise : vous savez exactement ce que vous payez." },
  ],
}

// The story is plain text edited in Espace OA: blank lines start a new
// paragraph and the contact address becomes a mailto link.
function StoryText({ text }) {
  return text.split(/\n\s*\n/).map((paragraph, i) => (
    <p className="section-text" key={i}>
      {paragraph.split(SITE.email).map((part, j) => (
        <span key={j}>{j > 0 && <a href={`mailto:${SITE.email}`}>{SITE.email}</a>}{part}</span>
      ))}
    </p>
  ))
}

export default function APropos() {
  const [content, setContent] = useState(DEFAULT_CONTENT)

  useEffect(() => {
    getContent('about_page').then(value => {
      if (!value) return
      const row = { value }
      try {
        // founderName is a legacy field (the section used to present the
        // founder): the page now only presents the company.
        const { founderName, ...parsed } = JSON.parse(row.value)
        setContent(c => ({ ...c, ...parsed }))
      } catch {}
    })
  }, [])

  return (
    <>
      <Seo
        title="À propos : scénographie d'événements sur-mesure"
        description="Découvrez OA Événementiel, spécialiste de l'organisation et de la scénographie d'événements sur-mesure en Île-de-France."
        path="/a-propos"
        breadcrumb={[{ name: 'À propos', path: '/a-propos' }]}
        preloadImage={PAGE_HEADER_DEFAULT}
      />

      <div className="site-wrap">
        <div
          className="page-header"
          style={{ backgroundImage: `url(${content.headerImg || PAGE_HEADER_DEFAULT})` }}
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

        {/* QUI SOMMES-NOUS — texte et photo édités depuis Espace OA > À Propos */}
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
                    <h2 className="section-title">{content.headline}</h2>
                    <StoryText text={content.story} />
                  </div>
                  <div className="why-us-counter-outer">
                    {content.counters.map((c, i) => (
                      <div className="counter-block" key={i}>
                        <h2 className="counter-count">{c.count}</h2>
                        <div className="counter-title-box">
                          <div className="counter-dot"></div>
                          <p className="counter-title">{c.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="why-us-image-box">
                  {content.photoUrl ? (
                    <img src={content.photoUrl} alt="OA Événementiel" className="apropos-photo" loading="lazy" decoding="async" />
                  ) : (
                    <div className="apropos-logo-box">
                      <img src="/logo-mark.png" alt="OA Événementiel — Événementiel, location" width="859" height="922" loading="lazy" decoding="async" />
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* NOS VALEURS — texte édité depuis Espace OA > À Propos */}
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
              {content.values.map((v, i) => (
                <div className="feature-block" key={i}>
                  <img src={VALUE_ICONS[i]} loading="lazy" alt="" className="feature-icon" />
                  <h4 style={{ color: 'rgb(0,0,0)' }} className="feature-title">{v.title}</h4>
                  <p style={{ color: 'rgb(0,0,0)' }} className="feature-text">{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="apropos-cta-section">
          <div className="container">
            <h2 className="apropos-cta-title">Discutons de votre événement</h2>
            <p className="apropos-cta-text">Parlons de votre projet et voyons comment lui donner vie ensemble.</p>
            <Link href="/contact" className="btn btn-rose-gold">Demander un devis</Link>
            <p className="apropos-cta-mail">ou écrivez-nous à <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
          </div>
        </section>
      </div>
    </>
  )
}

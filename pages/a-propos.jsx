import { useEffect, useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { supabase } from '../src/lib/supabase.js'

// Fixed icons for the "Nos valeurs" blocks — same 4 icons reused on the
// homepage's "Pourquoi OA" section. Only the title/text come from the DB.
const VALUE_ICONS = ['/return.avif', '/delivery-truck.avif', '/customer-service.avif', '/money-back.avif']

// Matches the seed row in src/lib/sqlite-db.js — used as the initial state
// so there's no flash of empty content before the fetch resolves.
const PAGE_HEADER_DEFAULT = '/PHOTO-2026-09-26-16-24-39_1.jpg'

const DEFAULT_CONTENT = {
  founderName: "[Prénom Nom], fondateur d'OA Événementiel",
  story: "[Votre histoire ici — pourquoi ce métier vous anime, depuis quand vous organisez des événements, ce qui rend votre approche différente. Deux ou trois phrases suffisent, je les mettrai en forme.]",
  photoUrl: null,
  headerImg: null,
  counters: [
    { count: '[X]+', label: "[Ex : Ans d'expérience]" },
    { count: '[X]+', label: '[Ex : Événements réalisés]' },
  ],
  values: [
    { title: '[Créativité sur-mesure]', text: '[Description à personnaliser.]' },
    { title: '[Logistique maîtrisée]', text: '[Description à personnaliser.]' },
    { title: '[Écoute & Accompagnement]', text: '[Description à personnaliser.]' },
    { title: '[Confiance & Transparence]', text: '[Description à personnaliser.]' },
  ],
}

export default function APropos() {
  const [content, setContent] = useState(DEFAULT_CONTENT)

  useEffect(() => {
    supabase.from('site_content').select('*').eq('key', 'about_page').then(({ data }) => {
      const row = data && data[0]
      if (!row) return
      try {
        const parsed = JSON.parse(row.value)
        setContent(c => ({ ...c, ...parsed }))
      } catch {}
    })
  }, [])

  return (
    <>
      <Head>
        <title>À Propos — OA Événementiel</title>
        <meta name="description" content="Découvrez OA Événementiel, organisation et scénographie d'événements sur-mesure en Île-de-France." />
      </Head>

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
                    <h2 className="section-title">{content.founderName}</h2>
                    <p className="section-text">{content.story}</p>
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
                    <img src={content.photoUrl} alt={content.founderName} className="apropos-photo" />
                  ) : (
                    <div className="apropos-photo-placeholder">
                      <i className="fas fa-camera" />
                      <p>Votre photo ici</p>
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
            <Link href="/reservation" className="btn btn-rose-gold">Demander un devis</Link>
          </div>
        </section>
      </div>
    </>
  )
}

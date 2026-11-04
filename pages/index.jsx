import RealisationsGrid from '../src/components/RealisationsGrid.jsx'
import { getRealisations } from '../src/lib/realisations-server.js'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Seo, { LOCAL_BUSINESS_LD, WEBSITE_LD, faqLd } from '../src/components/Seo.jsx'
import Faq from '../src/components/seo/Faq.jsx'
import RichText from '../src/components/seo/RichText.jsx'
import { EVENTS, GUIDES } from '../src/lib/seo/landings.js'
import { getJsonContent } from '../src/lib/public-api.js'
import ShopCard from '../src/components/product/ShopCard.jsx'
import QuickView from '../src/components/product/QuickView.jsx'
import { catalogueCategoryHref, useCatalogueCart } from '../src/components/product/productUtils.js'
import Icon from '../src/components/Icon.jsx'
import HeroVideo from '../src/components/HeroVideo.jsx'
import { track } from '../src/lib/analytics.js'

// Fallback photo of the "Organisation sur mesure" banner, swappable from
// Espace OA > Visuel Site > Accueil (slot key kept from the old Nos Univers
// block so an already chosen photo stays in place).
const BANNER_IMG = 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=70&auto=format&fit=crop'

// "Nos catégories" mosaic, modelled on options.fr's home block: one tall
// tile on the left, two stacked tiles in each of the other columns. Photos
// are swappable from Espace OA > Visuel Site > Accueil — Catégories.
const CATEGORY_TILES = [
  { slotKey: 'categorie_1', title: 'Chaises', value: 'CHAISES', img: '/catalogue/Chaises_600x800.jpg' },
  { slotKey: 'categorie_2', title: 'Tables', value: 'TABLES', img: '/catalogue/Tables_1200x670.jpg' },
  { slotKey: 'categorie_3', title: 'Banquettes', value: 'BANQUETTES', img: '/catalogue/Banquettes_600x800.jpg', raised: true },
  { slotKey: 'categorie_4', title: 'Décorations', value: 'DÉCORATIONS', img: '/catalogue/Decorations_800x800.jpg' },
  { slotKey: 'categorie_5', title: 'Accessoires', value: 'OPTIONS & ACCESSOIRES', img: '/catalogue/Options-accessoires_600x800.jpg' },
]

// Reassurance strip, modelled on options.fr's "Louez tout le matériel pour
// votre réception !" block (reference at /example). Copy built only from
// claims the site already makes elsewhere.
const ASSURANCES = [
  { icon: 'book', title: 'Tout pour votre décor', tag: 'Mobilier, vaisselle et éclairage', text: 'Composez votre réception pièce par pièce dans notre catalogue en ligne.' },
  { icon: 'truck', title: 'Livré et installé', tag: 'Pris en charge de A à Z', text: 'Livraison, montage et démontage assurés par notre équipe.' },
  { icon: 'users', title: 'La location pour tous', tag: 'Particuliers et professionnels', text: 'Mariages, anniversaires, séminaires : quelle que soit la taille de votre événement.' },
  { icon: 'headset', title: 'Accompagnement 7j/7', tag: 'Du premier échange au jour J', text: 'Une équipe à votre écoute pour vous conseiller à chaque étape.' },
]

// "Louez en 4 étapes" — options.fr's step strip, written for OA's real
// flow: catalogue cart → reservation form → online estimate → team
// confirmation, then payment + tracking via /suivi.
const ETAPES = [
  { title: 'Faites votre sélection', text: 'Mobilier, art de la table et décoration : ajoutez vos pièces au panier depuis le catalogue.' },
  { title: 'Indiquez la date et le lieu', text: "Au moment de commander, choisissez le ou les jours de votre événement et l'adresse de livraison." },
  { title: 'Vérifiez votre total', text: 'Le prix de la location et de la livraison est calculé immédiatement.' },
  { title: 'Payez, c’est réservé', text: 'Réglez en ligne par carte : votre location est confirmée aussitôt, suivez-la depuis votre commande.' },
]

const HOME_FAQ = [
  { q: 'Quel matériel événementiel peut-on louer ?', a: 'Des [tentes de réception](/location/tentes), des [tables](/location/tables), des [chaises](/location/chaises), des [banquettes](/location/banquettes), de la [vaisselle](/location/vaisselle-art-de-la-table), de la [décoration](/location/decorations) et des [accessoires](/location/options-accessoires) comme l’éclairage ou le chauffage.' },
  { q: 'Où livrez-vous ?', a: 'Nous livrons dans TOUTE la France. Les frais de livraison sont calculés automatiquement en ligne selon la distance routière avant le paiement.' },
  { q: 'Le prix de la livraison est-il connu à l’avance ?', a: 'Oui, le total de la location et de la livraison est calculé en ligne selon votre adresse, avant le paiement.' },
  { q: 'Le matériel est-il installé ?', a: 'Notre équipe assure la livraison, le montage et le démontage. Pour les tentes de réception, l’installation, la désinstallation et le lestage sont inclus dans le prix de location, hors frais kilométriques.' },
]

const SELECTION_SIZE = 8

// Homepage selection: cards taken in turn from each category (one chair,
// one table, one tent…) so it reads as "a bit of everything we rent".
function pickSelection(cards) {
  const byCategory = {}
  for (const c of cards) (byCategory[c.category] ||= []).push(c)
  const queues = Object.values(byCategory).map(list => [...list].sort((a, b) => (b.imageUrl ? 1 : 0) - (a.imageUrl ? 1 : 0)))
  const out = []
  while (out.length < SELECTION_SIZE && queues.some(q => q.length)) {
    for (const q of queues) if (q.length && out.length < SELECTION_SIZE) out.push(q.shift())
  }
  return out
}

export async function getServerSideProps() {
  const { getCatalogueCards } = await import('../src/lib/catalogue-cards.js')
  const [realisations, { cards }] = await Promise.all([getRealisations(), getCatalogueCards()])
  return { props: { realisations: realisations.slice(0, 6), selection: pickSelection(cards), productCount: cards.length } }
}

export default function Home({ realisations, selection, productCount }) {
  const cart = useCatalogueCart()
  const [quick, setQuick] = useState(null)
  // The hero's entrance animation is pure CSS (see .hero-reveal in
  // index.css) — it starts on first paint, no JS flag needed.

  const [images, setImages] = useState({})
  useEffect(() => {
    getJsonContent('images_home').then(v => { if (v) setImages(v) })
  }, [])

  // Title colours of the "Nos catégories" tiles, set in Espace OA.
  const [catColors, setCatColors] = useState({})
  useEffect(() => {
    getJsonContent('home_categories_style').then(v => { if (v) setCatColors(v) })
  }, [])

  const inCartOf = card => card.variants.reduce((n, v) => n + (cart[v.id] || 0), 0)

  return (
    <>
      <Seo
        title="Location de matériel événementiel dans toute la France | OA Événementiel"
        description="Louez en ligne tentes, tables, chaises, vaisselle et décoration pour vos événements dans toute la France. Prix affichés, livraison et installation partout en France."
        path="/"
        jsonLd={[LOCAL_BUSINESS_LD, WEBSITE_LD, faqLd(HOME_FAQ)]}
        preloadImage="/videos/oa-hero-poster.jpg"
      />

      <div className="page-wrapper">
        {/* HERO */}
        <section id="Hero-Section" className="oa-hero" aria-labelledby="oa-hero-title">
          <HeroVideo />
          <div className="oa-container oa-hero-inner">
            <p className="oa-hero-eyebrow hero-reveal hero-reveal-1">Tentes, mobilier, vaisselle & décoration</p>
            <h1 id="oa-hero-title" className="oa-hero-title hero-reveal hero-reveal-2">
              Location de matériel événementiel dans toute la France
            </h1>
            <p className="oa-hero-text hero-reveal hero-reveal-3">
              Louez tout pour votre réception : choisissez en ligne, réservez votre date, nous livrons et installons chez vous.
            </p>
            <div className="oa-hero-actions hero-reveal hero-reveal-4">
              <Link href="/catalogue/complet" className="shop-btn shop-btn-gold shop-btn-xl" onClick={() => track('Clic Catalogue', { emplacement: 'hero' })}>
                <i className="fas fa-th-large" /> Voir le catalogue
              </Link>
              <Link href="/catalogue" className="shop-btn shop-btn-light shop-btn-xl" onClick={() => track('Clic Réserver', { emplacement: 'hero' })}>
                <i className="far fa-calendar-check" /> Réserver mon événement
              </Link>
            </div>
          </div>
        </section>

        {/* ARGUMENTS — compact reassurance under the hero */}
        <section className="shop-usp" aria-label="Nos engagements">
          <ul className="shop-usp-list">
            {ASSURANCES.map(a => (
              <li key={a.title}>
                <Icon name={a.icon} size={30} strokeWidth={1.2} />
                <span><strong>{a.title}</strong><small>{a.tag}</small></span>
              </li>
            ))}
          </ul>
        </section>

        {/* NOS CATÉGORIES — options.fr category mosaic */}
        <section
          className="oa-home-cats"
          aria-labelledby="oa-home-cats-title"
          style={{
            ...(catColors.textColor && { '--oa-cat-text': catColors.textColor }),
            ...(catColors.hoverColor && { '--oa-cat-hover': catColors.hoverColor }),
          }}
        >
          <h2 id="oa-home-cats-title" className="oa-section-title" data-reveal>Nos catégories</h2>
          <div className="oa-home-cats-grid" data-reveal>
            {[[0], [1, 2], [3, 4]].map((col, c) => (
              <div className="oa-home-cats-col" key={c}>
                {col.map(i => {
                  const t = CATEGORY_TILES[i]
                  return (
                    <Link
                      key={t.slotKey}
                      href={catalogueCategoryHref(t.value)}
                      className={`oa-home-cat${col.length === 1 ? ' is-tall' : ''}${t.raised ? ' is-raised' : ''}`}
                      style={{ backgroundImage: `url(${images[t.slotKey] || t.img})` }}
                    >
                      <h3 className="oa-home-cat-title">{t.title}</h3>
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
        </section>

        {/* NOTRE SÉLECTION — products to add to the cart */}
        {selection.length > 0 && (
          <section className="oa-section oa-section-tight shop-home-selection" aria-labelledby="shop-selection-title">
            <div className="oa-container">
              <div className="home-head" data-reveal>
                <h2 id="shop-selection-title" className="home-title">Notre <em>sélection</em></h2>
                <p className="home-head-note">À louer dès maintenant</p>
              </div>
              <div className="shop-grid" data-reveal>
                {selection.map((card, i) => (
                  <ShopCard key={card.key} card={card} inCart={inCartOf(card)} onQuickView={setQuick} eager={i < 4} place="accueil" />
                ))}
                <Link href="/catalogue/complet" className="home-sel-all">
                  <strong>Voir tout le catalogue</strong>
                  <span>{productCount} articles <i className="fas fa-arrow-right" aria-hidden="true" /></span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* LOUEZ EN 4 ÉTAPES */}
        <section className="oa-section-tight oa-steps" aria-labelledby="oa-steps-title">
          <div className="oa-container">
            <div className="home-head" data-reveal>
              <h2 id="oa-steps-title" className="home-title">Louez en <em>4 étapes</em></h2>
              <Link href="/catalogue/complet" className="shop-btn shop-btn-gold shop-btn-xl" onClick={() => track('Clic Réserver', { emplacement: 'étapes' })}>
                <i className="far fa-calendar-check" /> Commencer ma sélection
              </Link>
            </div>
            <ol className="oa-steps-list" data-reveal>
              {ETAPES.map((e, i) => (
                <li className="oa-step" key={e.title}>
                  <span className="oa-step-num" aria-hidden="true">{i + 1}</span>
                  <div className="oa-step-body">
                    <h3 className="oa-step-title">{e.title}</h3>
                    <p className="oa-step-text">{e.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* BANNIÈRE — custom projects */}
        <section className="shop-banner" style={{ backgroundImage: `url(${images.univers_1 || BANNER_IMG})` }}>
          <div className="shop-banner-inner" data-reveal>
            <span className="oa-eyebrow">Organisation sur mesure</span>
            <h2>Un mariage, un anniversaire, un séminaire ?</h2>
            <p>Au-delà de la location, notre équipe conçoit et installe la scénographie complète de votre événement.</p>
            <div className="shop-banner-actions">
              <Link href="/contact" className="shop-btn shop-btn-light">Demander un devis</Link>
            </div>
          </div>
        </section>

        {/* RÉALISATIONS */}
        <section className="oa-section oa-realisations">
          <div className="oa-container">
            <div className="oa-section-head oa-section-head-split" data-reveal>
              <div>
                <span className="oa-eyebrow">Réalisations</span>
                <h2 className="oa-section-title">Quelques instants capturés</h2>
              </div>
              <Link href="/nos-realisations" className="oa-univers-link">Voir toutes nos réalisations <i className="fas fa-arrow-right" /></Link>
            </div>
            <RealisationsGrid items={realisations} />
          </div>
        </section>


        {/* LOCATION DANS TOUTE LA FRANCE — occasions et guides */}
        <section id="nous-trouver" data-scroll-flush className="oa-section seo-home home-loueur" aria-labelledby="seo-home-title">
          <div className="oa-container">
            <div className="home-loueur-intro" data-reveal>
              <h2 id="seo-home-title" className="home-title">Tout le matériel de votre événement, <em>au même endroit</em></h2>
              <p><RichText text="OA Événementiel loue aux particuliers et aux professionnels le matériel de leurs réceptions : [tentes](/location/tentes), [tables](/location/tables), [chaises](/location/chaises), [banquettes](/location/banquettes), [vaisselle](/location/vaisselle-art-de-la-table) et [décoration](/location/decorations). Les prix sont affichés en ligne et le total, livraison comprise, est calculé avant le paiement." /></p>
              <p className="home-loueur-sign">Votre loueur dans toute la France</p>
            </div>
            <div className="seo-link-columns" data-reveal>
              <div>
                <h3>Selon votre événement</h3>
                <ul>{EVENTS.map(e => <li key={e.slug}><Link href={`/evenements/${e.slug}`}>{e.title.replace(' en Île-de-France', '')}</Link></li>)}</ul>
              </div>
              <div>
                <h3>Livraison &amp; installation</h3>
                <p style={{ color: 'var(--oa-muted)', lineHeight: '1.6', marginTop: '10px' }}>
                  Livraison et montage dans <strong>TOUTE la France</strong> 7j/7 et 24h/24. Vos frais kilométriques sont calculés en temps réel dès la saisie de votre adresse.
                </p>
                <p style={{ marginTop: '14px' }}>
                  <Link href="/catalogue/complet" className="list-text-link">Voir tout le catalogue →</Link>
                </p>
              </div>
              <div>
                <h3>Nos conseils</h3>
                <ul>{GUIDES.map(g => <li key={g.slug}><Link href={`/guides/${g.slug}`}>{g.title}</Link></li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        {/* VOS QUESTIONS */}
        <div className="home-faq">
          <div className="oa-container" data-reveal>
            <Faq items={HOME_FAQ} title="Vos questions sur la location" more />
          </div>
        </div>

        {/* CTA FINALE */}
        <section className="apropos-cta-section">
          <div className="container">
            <h2 className="apropos-cta-title oa-section-title">Prêt à composer votre réception ?</h2>
            <p className="apropos-cta-text">Choisissez vos articles, indiquez votre date : le total, livraison comprise, est calculé en ligne.</p>
            <div className="oa-center-cta" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/catalogue/complet" className="shop-btn shop-btn-dark shop-btn-xl">Voir le catalogue</Link>
              <Link href="/catalogue" className="shop-btn shop-btn-gold shop-btn-xl">Réserver mon événement</Link>
            </div>
          </div>
        </section>
      </div>

      {quick && <QuickView card={quick} onClose={() => setQuick(null)} />}
    </>
  )
}

import RealisationsGrid from '../src/components/RealisationsGrid.jsx'
import { getRealisations } from '../src/lib/realisations-server.js'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Seo, { ORGANIZATION_LD } from '../src/components/Seo.jsx'
import { supabase } from '../src/lib/supabase.js'
import ShopCard from '../src/components/product/ShopCard.jsx'
import QuickView from '../src/components/product/QuickView.jsx'
import { useCatalogueCart } from '../src/components/product/productUtils.js'
import Icon from '../src/components/Icon.jsx'
import HeroVideo from '../src/components/HeroVideo.jsx'
import { track } from '../src/lib/analytics.js'

const UNIVERS = [
  {
    slotKey: 'univers_1',
    href: '/nos-realisations',
    title: 'Mariages & Réceptions',
    text: 'De la demande à la nuit de noces, une scénographie pensée dans le moindre détail.',
    img: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=720&q=70&auto=format&fit=crop',
  },
  {
    slotKey: 'univers_2',
    href: '/nos-realisations',
    title: 'Anniversaires & Fêtes',
    text: "Des célébrations sur mesure, intimes ou grandioses, à votre image.",
    img: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=720&q=70&auto=format&fit=crop',
  },
  {
    slotKey: 'univers_3',
    href: '/catalogue',
    title: 'Location de Décoration',
    text: 'Mobilier, art de la table et scénographie disponibles à la location, livrés et installés.',
    img: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=720&q=70&auto=format&fit=crop',
  },
]

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
  { title: 'Indiquez la date et le lieu', text: "Choisissez le ou les jours de votre événement et l'adresse de livraison." },
  { title: 'Vérifiez votre total', text: 'Le prix de la location et de la livraison est calculé en ligne.' },
  { title: 'Confirmez et suivez', text: 'Réglez le premier versement pour confirmer automatiquement la location, puis suivez votre commande en ligne.' },
]

const STATS = [
  { count: '150+', label: 'Fêtes Réussies' },
  { count: '120+', label: 'Couples Heureux' },
  { count: '5+', label: "Ans d'Expertise" },
  { count: '99%', label: 'Satisfaction Client' },
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
    supabase.from('site_content').select('*').eq('key', 'images_home').then(({ data }) => {
      const row = data && data[0]
      if (!row) return
      try { setImages(JSON.parse(row.value)) } catch {}
    })
  }, [])

  // Title colours of the "Nos catégories" tiles, set in Espace OA.
  const [catColors, setCatColors] = useState({})
  useEffect(() => {
    supabase.from('site_content').select('*').eq('key', 'home_categories_style').then(({ data }) => {
      const row = data && data[0]
      if (!row) return
      try { setCatColors(JSON.parse(row.value) || {}) } catch {}
    })
  }, [])

  const inCartOf = card => card.variants.reduce((n, v) => n + (cart[v.id] || 0), 0)

  return (
    <>
      <Seo
        title="OA Événementiel — Location de mobilier et de décoration pour vos réceptions"
        description="Louez en ligne chaises, tables, tentes, art de la table et décoration pour vos mariages, anniversaires et événements en Île-de-France. Livraison et installation."
        path="/"
        jsonLd={ORGANIZATION_LD}
      />

      <div className="page-wrapper">
        {/* HERO */}
        <section id="Hero-Section" className="oa-hero" aria-labelledby="oa-hero-title">
          <HeroVideo />
          <div className="oa-container oa-hero-inner">
            <p className="oa-hero-eyebrow hero-reveal hero-reveal-1">Location de mobilier & décoration</p>
            <h1 id="oa-hero-title" className="oa-hero-title hero-reveal hero-reveal-2">
              Louez tout pour votre réception
            </h1>
            <p className="oa-hero-text hero-reveal hero-reveal-3">
              Chaises, tables, tentes, art de la table et décoration : choisissez en ligne, réservez votre date, nous livrons et installons en Île-de-France.
            </p>
            <div className="oa-hero-actions hero-reveal hero-reveal-4">
              <Link href="/catalogue/complet" className="shop-btn shop-btn-gold shop-btn-xl" onClick={() => track('Clic Catalogue', { emplacement: 'hero' })}>
                <i className="fas fa-th-large" /> Voir le catalogue
              </Link>
              <Link href="/reservation" className="shop-btn shop-btn-light shop-btn-xl" onClick={() => track('Clic Réserver', { emplacement: 'hero' })}>
                <i className="far fa-calendar-check" /> Réserver une date
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
                      href={`/catalogue/complet?categorie=${encodeURIComponent(t.value)}`}
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
              <div className="shop-section-head" data-reveal>
                <div>
                  <span className="oa-eyebrow">À louer dès maintenant</span>
                  <h2 id="shop-selection-title" className="oa-section-title">Notre sélection</h2>
                </div>
                <Link href="/catalogue/complet" className="shop-link-arrow">Tout le catalogue ({productCount}) <i className="fas fa-arrow-right" /></Link>
              </div>
              <div className="shop-grid" data-reveal>
                {selection.map((card, i) => (
                  <ShopCard key={card.key} card={card} inCart={inCartOf(card)} onQuickView={setQuick} eager={i < 4} place="accueil" />
                ))}
              </div>
              <div className="oa-center-cta" data-reveal>
                <Link href="/catalogue/complet" className="shop-btn shop-btn-dark shop-btn-xl">
                  Voir tout le catalogue <i className="fas fa-arrow-right" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* LOUEZ EN 4 ÉTAPES — options.fr step strip */}
        <section className="oa-section-tight oa-steps" aria-labelledby="oa-steps-title">
          <div className="oa-container">
            <h2 id="oa-steps-title" className="oa-section-title">Louez en 4 étapes</h2>
            <ol className="oa-steps-list">
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
            <div className="oa-center-cta">
              <Link href="/reservation" className="shop-btn shop-btn-gold shop-btn-xl" onClick={() => track('Clic Réserver', { emplacement: 'étapes' })}>
                <i className="far fa-calendar-check" /> Commencer ma réservation
              </Link>
            </div>
          </div>
        </section>

        {/* BANNIÈRE — custom projects */}
        <section className="shop-banner" style={{ backgroundImage: `url(${images.univers_1 || UNIVERS[0].img})` }}>
          <div className="shop-banner-inner" data-reveal>
            <span className="oa-eyebrow">Organisation sur mesure</span>
            <h2>Un mariage, un anniversaire, un séminaire ?</h2>
            <p>Au-delà de la location, notre équipe conçoit et installe la scénographie complète de votre événement.</p>
            <div className="shop-banner-actions">
              <Link href="/contact" className="shop-btn shop-btn-light">Demander un devis</Link>
            </div>
          </div>
        </section>

        {/* NOS UNIVERS */}
        <section className="oa-section oa-univers">
          <div className="oa-container">
            <div className="oa-section-head" data-reveal>
              <span className="oa-eyebrow">Nos Univers</span>
              <h2 className="oa-section-title">Un événement, une histoire</h2>
            </div>
            <div className="oa-univers-grid" data-reveal>
              {UNIVERS.map(u => (
                <Link href={u.href} key={u.title} className="oa-univers-card">
                  <div className="oa-univers-image" style={{ backgroundImage: `url(${images[u.slotKey] || u.img})` }} />
                  <div className="oa-univers-body">
                    <h3 className="oa-heading" style={{ fontSize: 'var(--oa-size-h3)' }}>{u.title}</h3>
                    <p className="oa-text-muted">{u.text}</p>
                    <span className="oa-univers-link">Découvrir <i className="fas fa-arrow-right" /></span>
                  </div>
                </Link>
              ))}
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

        {/* CHIFFRES CLÉS */}
        <section className="oa-section-tight oa-stats-band">
          <div className="oa-container oa-stats-grid" data-reveal>
            {STATS.map(s => (
              <div className="oa-stat" key={s.label}>
                <span className="oa-stat-count">{s.count}</span>
                <span className="oa-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA FINALE */}
        <section className="apropos-cta-section">
          <div className="container">
            <h2 className="apropos-cta-title oa-section-title">Prêt à composer votre réception ?</h2>
            <p className="apropos-cta-text">Choisissez vos articles, indiquez votre date : le total, livraison comprise, est calculé en ligne.</p>
            <div className="oa-center-cta" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/catalogue/complet" className="shop-btn shop-btn-dark shop-btn-xl">Voir le catalogue</Link>
              <Link href="/reservation" className="shop-btn shop-btn-gold shop-btn-xl">Réserver mon événement</Link>
            </div>
          </div>
        </section>
      </div>

      {quick && <QuickView card={quick} onClose={() => setQuick(null)} />}
    </>
  )
}

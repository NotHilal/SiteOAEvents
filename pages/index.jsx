import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Seo, { ORGANIZATION_LD } from '../src/components/Seo.jsx'
import { useRouter } from 'next/router'
import { supabase } from '../src/lib/supabase.js'
import { getUnitPriceTtc, groupTiersByMaterial, getMinOrderQty } from '../src/lib/pricing.js'
import { addToCatalogueCart } from '../src/lib/cart.js'
import { slugify } from '../src/lib/slug.js'
import Icon from '../src/components/Icon.jsx'
import { track } from '../src/lib/analytics.js'

const HERO_DEFAULTS = { hero_left: '/Minimalist_Living_Room.avif', hero_right: '/Modern_Minimalist_Living_Room.avif' }

const UNIVERS = [
  {
    slotKey: 'univers_1',
    title: 'Mariages & Réceptions',
    text: 'De la demande à la nuit de noces, une scénographie pensée dans le moindre détail.',
    img: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=720&q=70&auto=format&fit=crop',
  },
  {
    slotKey: 'univers_2',
    title: 'Anniversaires & Fêtes',
    text: "Des célébrations sur mesure, intimes ou grandioses, à votre image.",
    img: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=720&q=70&auto=format&fit=crop',
  },
  {
    slotKey: 'univers_3',
    title: 'Location de Décoration',
    text: 'Mobilier, art de la table et scénographie disponibles à la location, livrés et installés.',
    img: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=720&q=70&auto=format&fit=crop',
  },
]

// Photos: public/images/prestations/ (OA's own, 900px WebP).
const PRESTATIONS = [
  { icon: 'fas fa-heart', img: '/images/prestations/organisation-mariage.webp', title: 'Organisation de Mariage', text: "Recherche du lieu, prestataires, coordination du jour J." },
  { icon: 'fas fa-birthday-cake', img: '/images/prestations/organisation-anniversaire.webp', title: "Organisation d'Anniversaire", text: 'Thème, décoration et animation sur mesure.' },
  { icon: 'fas fa-briefcase', img: '/images/prestations/evenements-professionnels.webp', title: 'Événements Professionnels', text: 'Séminaires, galas et lancements d\'entreprise.' },
  { icon: 'fas fa-star', img: '/images/prestations/location-decoration.webp', title: 'Location de Décoration', text: 'Vaisselle, mobilier et éclairage, livrés et installés.' },
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
  { title: 'Recevez votre estimation', text: 'Le devis indicatif est calculé en ligne, livraison comprise.' },
  { title: 'Confirmez et suivez', text: 'Notre équipe valide votre demande, puis vous réglez et suivez votre commande en ligne.' },
]

const REALISATIONS = [
  { slotKey: 'realisation_1', src: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=70&auto=format&fit=crop', label: 'Mariage' },
  { slotKey: 'realisation_2', src: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=70&auto=format&fit=crop', label: 'Mariage' },
  { slotKey: 'realisation_3', src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=70&auto=format&fit=crop', label: 'Anniversaire' },
  { slotKey: 'realisation_4', src: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&q=70&auto=format&fit=crop', label: 'Anniversaire' },
  { slotKey: 'realisation_5', src: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=70&auto=format&fit=crop', label: 'Événement Pro' },
  { slotKey: 'realisation_6', src: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&q=70&auto=format&fit=crop', label: 'Location Déco' },
]

const STATS = [
  { count: '150+', label: 'Fêtes Réussies' },
  { count: '120+', label: 'Couples Heureux' },
  { count: '5+', label: "Ans d'Expertise" },
  { count: '99%', label: 'Satisfaction Client' },
]

export default function Home() {
  const router = useRouter()
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

  // Homepage teaser for /catalogue — one item per category (up to 4) rather
  // than just the first 4 rows, so the preview reads as "a bit of everything
  // we rent" instead of whatever happens to sort first.
  const [catalogueTeaser, setCatalogueTeaser] = useState([])
  const [catalogueTiers, setCatalogueTiers] = useState({})
  const [addedId, setAddedId] = useState(null)
  useEffect(() => {
    Promise.all([
      supabase.from('materials').select('*').eq('available', true).order('category'),
      supabase.from('material_price_tiers').select('*'),
      supabase.from('products').select('*'),
    ]).then(([matRes, tierRes, prodRes]) => {
      const tiers = groupTiersByMaterial(tierRes.data || [])
      setCatalogueTiers(tiers)
      // First item of each category. An option of an article à options is
      // shown as its article (name, page, cheapest option's price) — the
      // option itself is chosen on the product page.
      const productById = Object.fromEntries((prodRes.data || []).map(p => [String(p.id), p]))
      const mats = matRes.data || []
      const byCategory = {}
      mats.forEach(m => {
        const cat = m.category || 'Autre'
        if (byCategory[cat]) return
        const product = m.product_id && productById[String(m.product_id)]
        if (!product) { byCategory[cat] = { ...m, displayName: m.name, href: `/catalogue/${m.slug || slugify(m.name)}` }; return }
        const options = mats.filter(o => String(o.product_id) === String(product.id))
        const prices = options.map(o => getUnitPriceTtc(tiers[String(o.id)], 'weekday', getMinOrderQty(tiers[String(o.id)]))).filter(p => p > 0)
        byCategory[cat] = {
          ...m, displayName: product.name, href: `/catalogue/${product.slug}`, isOptions: true,
          image_url: options.find(o => o.image_url)?.image_url || null,
          fromPrice: prices.length ? Math.min(...prices) : 0,
        }
      })
      setCatalogueTeaser(Object.values(byCategory).slice(0, 4))
    })
  }, [])

  function handleQuickAdd(m) {
    const minQty = getMinOrderQty(catalogueTiers[String(m.id)])
    addToCatalogueCart(m.id, minQty)
    track('Ajout panier', { emplacement: 'accueil' })
    setAddedId(m.id)
    setTimeout(() => setAddedId(id => id === m.id ? null : id), 1600)
  }

  // Réalisations carousel — a true infinite loop, not a scroll or a single
  // fixed track: REALISATIONS is rendered three times back to back, and
  // `position` starts at the first index of the middle copy. Stepping past
  // either end of that middle copy always slides into a REAL adjacent photo
  // (a copy of it) — never blank space — and once that slide's transition
  // finishes, the track snaps instantly (transition briefly switched off)
  // back to the equivalent position inside the middle copy, so the loop
  // never runs out of copies to slide into no matter how many times it's
  // clicked. Auto-advances by one photo every 5s; using either arrow steps
  // immediately and restarts that 5s timer, so manual navigation never gets
  // undone by an auto-advance landing right after it.
  const REALISATIONS_N = REALISATIONS.length
  const realisationsTrackRef = useRef(null)
  const realisationsTimerRef = useRef(null)
  // Blocks a new step from starting until the current one has fully
  // resolved — slide transition finished AND (if needed) the invisible
  // snap-back applied. Without this, spam-clicking an arrow queues up
  // position changes faster than they can resolve, drifting `realisationPos`
  // past the single copy of buffer photos on each side of the middle third,
  // which is what was producing blank space / multiple photos flashing.
  const realisationsAnimatingRef = useRef(false)
  const [realisationPos, setRealisationPos] = useState(REALISATIONS_N)
  const [realisationTransition, setRealisationTransition] = useState(true)
  const [realisationStep, setRealisationStep] = useState(278)

  useEffect(() => {
    const measure = () => {
      const track = realisationsTrackRef.current
      const firstItem = track?.querySelector('.oa-realisation-item')
      if (!firstItem) return
      // Reads the actual CSS gap instead of a hardcoded number, so the
      // slide math stays correct if the gap ever changes at a breakpoint
      // (e.g. the smaller mobile gap) without needing a matching JS edit.
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0
      setRealisationStep(firstItem.offsetWidth + gap)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  function stepRealisations(direction) {
    if (realisationsAnimatingRef.current) return
    realisationsAnimatingRef.current = true
    setRealisationTransition(true)
    setRealisationPos(p => p + direction)
  }

  function handleRealisationsTransitionEnd() {
    const outOfBounds = realisationPos >= 2 * REALISATIONS_N || realisationPos < REALISATIONS_N
    if (!outOfBounds) {
      realisationsAnimatingRef.current = false
      return
    }
    setRealisationTransition(false)
    setRealisationPos(p => p >= 2 * REALISATIONS_N ? p - REALISATIONS_N : p + REALISATIONS_N)
    // Double rAF: let the transition:none frame actually paint before
    // switching it back on, same technique as the hero entrance animation —
    // otherwise the browser can coalesce both style changes into one frame
    // and animate the "snap" instead of cutting it instantly.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setRealisationTransition(true)
        realisationsAnimatingRef.current = false
      })
    })
  }

  function restartRealisationsAutoplay() {
    clearInterval(realisationsTimerRef.current)
    realisationsTimerRef.current = setInterval(() => stepRealisations(1), 5000)
  }

  useEffect(() => {
    restartRealisationsAutoplay()
    return () => clearInterval(realisationsTimerRef.current)
  }, [])

  function handleRealisationsArrow(direction) {
    stepRealisations(direction)
    restartRealisationsAutoplay()
  }

  return (
    <>
      <Seo
        title="OA Événementiel — Organisation d'événements et location de décoration"
        description="Organisation de mariages, anniversaires, événements d'entreprise et location de mobilier et de décoration raffinée en Île-de-France."
        path="/"
        jsonLd={ORGANIZATION_LD}
      />

      <div className="page-wrapper">
        {/* HERO */}
        <section id="Hero-Section" className="hero-section">
          <div className="hero-wrapper">
            <img
              className="hero-shape hero-reveal"
              src="/grey-layer-vector-file.avif"
              alt=""
              sizes="(max-width: 3160px) 100vw, 3160px"
              loading="lazy"
            />
            <div className="w-layout-blockcontainer container w-container">
              <div className="w-layout-grid hero-grid">
                <div className="hero-content">
                  <div className="section-subtitle-box hero-reveal hero-reveal-1">
                    <div className="section-subtitle-icon"></div>
                    <p className="section-subtitle">Créateur d'Émotions</p>
                  </div>
                  <h1 className="hero-title hero-reveal hero-reveal-2">
                    Organisation & Scénographie d'Événements
                  </h1>
                  <p className="hero-text hero-reveal hero-reveal-3">
                    Mariages, anniversaires, réceptions privées ou professionnelles... Nous concevons et décorons vos plus beaux moments en Île-de-France.
                  </p>
                  <div className="hero-btn-box hero-reveal hero-reveal-4">
                    <Link href="/reservation" className="theme-button w-inline-block">
                      <div className="theme-button-content">
                        <div className="theme-button-text">Réserver</div>
                        <div className="theme-button-hover-text">Réserver</div>
                      </div>
                    </Link>
                    <Link href="/services" className="theme-button theme-button-outline w-inline-block">
                      <div className="theme-button-content">
                        <div className="theme-button-text">Prestations</div>
                        <div className="theme-button-hover-text">Prestations</div>
                      </div>
                    </Link>
                  </div>
                </div>
                <div className="hero-image-box">
                  <div className="animated-image-wrapper hero-reveal-img hero-reveal-img-1">
                    <img
                      fetchPriority="high"
                      alt="Décoration de mariage raffinée"
                      src={images.hero_left || HERO_DEFAULTS.hero_left}
                      className="animated-image"
                    />
                  </div>
                  <div className="animated-image-wrapper two hero-reveal-img hero-reveal-img-2">
                    <img
                      alt="Mise en scène évènementielle"
                      src={images.hero_right || HERO_DEFAULTS.hero_right}
                      className="animated-image"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RÉASSURANCE — options.fr reassurance block */}
        <section className="oa-section-tight oa-assurance" aria-labelledby="oa-assurance-title">
          <div className="oa-container">
            <h2 id="oa-assurance-title" className="oa-section-title" data-reveal>
              Tout le nécessaire pour sublimer votre réception
            </h2>
            <ul className="oa-assurance-grid" data-reveal>
              {ASSURANCES.map(a => (
                <li className="oa-assurance-item" key={a.title}>
                  <Icon name={a.icon} size={48} strokeWidth={1} className="oa-assurance-icon" />
                  <div className="oa-assurance-body">
                    <h3 className="oa-assurance-item-title">{a.title}</h3>
                    <p className="oa-assurance-tag">{a.tag}</p>
                    <p className="oa-assurance-text">{a.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="oa-assurance-intro" data-reveal>
              <p>
                Spécialiste de l'organisation d'événements et de la location de décoration en Île-de-France,
                OA Événementiel vous accompagne dans la concrétisation de vos projets privés et professionnels.
              </p>
              <p>
                Mobilier, art de la table, éclairage et scénographie : composez la réception qui vous ressemble.
                Laissez-vous guider par vos envies !
              </p>
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
              {UNIVERS.map((u, i) => (
                <Link href="/services" key={u.title} className="oa-univers-card">
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

        {/* NOS PRESTATIONS */}
        <section className="oa-section oa-section-tight oa-prestations">
          <div className="oa-container">
            <div className="oa-section-head" data-reveal>
              <span className="oa-eyebrow">Nos Prestations</span>
              <h2 className="oa-section-title">Un accompagnement complet</h2>
            </div>
            {/* Same card as "Choisissez votre mobilier" (.oa-product-card):
                square photo, centered title + line, shadow and a button
                rising at the bottom of the photo on hover. */}
            <div className="oa-catalogue-teaser-grid" data-reveal>
              {PRESTATIONS.map(p => (
                <Link href="/services" className="oa-product-card oa-prestation-card" key={p.title}>
                  <div className="oa-product-media">
                    <img src={p.img} alt={p.title} width="900" height="900" loading="lazy" decoding="async" />
                    <span className="oa-product-add" aria-hidden="true">
                      <span>Découvrir</span>
                      <i className="fas fa-arrow-right" />
                    </span>
                  </div>
                  <div className="oa-product-details">
                    <div className="oa-prestation-icon" aria-hidden="true"><i className={p.icon} /></div>
                    <h3 className="oa-product-name">{p.title}</h3>
                    <p className="oa-product-price">{p.text}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="oa-center-cta" data-reveal>
              <Link href="/services" className="btn btn-rose-gold">Voir toutes nos prestations</Link>
            </div>
          </div>
        </section>

        {/* CATALOGUE */}
        {catalogueTeaser.length > 0 && (
          <section className="oa-section oa-section-tight oa-catalogue-teaser">
            <div className="oa-container">
              <div className="oa-section-head oa-section-head-split" data-reveal>
                <div>
                  <span className="oa-eyebrow">Catalogue</span>
                  <h2 className="oa-section-title">Choisissez votre mobilier</h2>
                </div>
                <Link href="/catalogue" className="oa-univers-link">Voir tout le catalogue <i className="fas fa-arrow-right" /></Link>
              </div>
              {/* Product cards modelled on options.fr's "Notre sélection du
                  moment": borderless, square image, centered name + price;
                  on hover a soft shadow and an "Ajouter au panier" button
                  rising at the bottom of the image. */}
              <div className="oa-catalogue-teaser-grid" data-reveal>
                {catalogueTeaser.map(m => {
                  const tiers = catalogueTiers[String(m.id)]
                  const minQty = getMinOrderQty(tiers)
                  const price = m.isOptions ? m.fromPrice : getUnitPriceTtc(tiers, 'weekday', minQty)
                  const added = addedId === m.id
                  return (
                    <article className={`oa-product-card${added ? ' is-added' : ''}`} key={m.id}>
                      <div className="oa-product-media">
                        <Link href={m.href} className="oa-product-media-link" tabIndex={-1} aria-hidden="true">
                          {m.image_url
                            ? <img src={m.image_url} alt="" loading="lazy" />
                            : <Icon name="image" size={40} strokeWidth={1} className="oa-product-placeholder" />}
                        </Link>
                        {m.isOptions ? (
                          <Link href={m.href} className="oa-product-add" aria-label={`Choisir une option de ${m.displayName}`}>
                            <Icon name="bag" size={18} strokeWidth={1.6} />
                            <span>Choisir une option</span>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className="oa-product-add"
                            onClick={() => handleQuickAdd(m)}
                            disabled={added}
                            aria-label={added ? `${m.name} ajouté au panier` : `Ajouter ${m.name} au panier`}
                          >
                            <Icon name={added ? 'check' : 'bag'} size={18} strokeWidth={1.6} />
                            <span>{added ? 'Ajouté au panier' : 'Ajouter au panier'}</span>
                          </button>
                        )}
                      </div>
                      <div className="oa-product-details">
                        <h3 className="oa-product-name"><Link href={m.href}>{m.displayName}</Link></h3>
                        {price > 0 && <p className="oa-product-price">dès {price.toFixed(2)} €</p>}
                      </div>
                    </article>
                  )
                })}
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
              <Link href="/galerie" className="oa-univers-link">Voir la galerie <i className="fas fa-arrow-right" /></Link>
            </div>
            <div className="oa-realisations-carousel">
              <button
                type="button"
                className="oa-carousel-arrow oa-carousel-arrow-left"
                aria-label="Photo précédente"
                onClick={() => handleRealisationsArrow(-1)}
              >
                <i className="fas fa-chevron-left" />
              </button>
              <div className="oa-realisations-strip">
                <div
                  className="oa-realisations-track"
                  data-reveal-group
                  ref={realisationsTrackRef}
                  onTransitionEnd={handleRealisationsTransitionEnd}
                  style={{
                    transform: `translateX(-${realisationPos * realisationStep}px)`,
                    transition: realisationTransition ? 'transform .55s cubic-bezier(.16,.84,.44,1)' : 'none',
                  }}
                >
                  {[...REALISATIONS, ...REALISATIONS, ...REALISATIONS].map((r, i) => (
                    <Link href="/galerie" key={i} className="oa-realisation-item">
                      <img src={images[r.slotKey] || r.src} alt="" loading="lazy" decoding="async" />
                      <span>{r.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="oa-carousel-arrow oa-carousel-arrow-right"
                aria-label="Photo suivante"
                onClick={() => handleRealisationsArrow(1)}
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          </div>
        </section>

        {/* CHIFFRES CLÉS */}
        <section className="oa-section-tight oa-stats-band">
          <div className="oa-container oa-stats-grid" data-reveal>
            {STATS.map((s, i) => (
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
            <h2 className="apropos-cta-title oa-section-title">Discutons de votre événement</h2>
            <p className="apropos-cta-text">Parlons de votre projet et voyons comment lui donner vie ensemble.</p>
            <div className="oa-center-cta" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/devis" className="btn btn-rose-gold">Simuler mon devis</Link>
              <Link href="/contact" className="theme-button theme-button-outline w-inline-block">
                <div className="theme-button-content"><div className="theme-button-text">Nous contacter</div></div>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

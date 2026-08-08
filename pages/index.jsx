import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import AOS from 'aos'
import { supabase } from '../src/lib/supabase.js'
import { getUnitPriceTtc, groupTiersByMaterial, getMinOrderQty } from '../src/lib/pricing.js'
import { addToCatalogueCart } from '../src/lib/cart.js'

const HERO_DEFAULTS = { hero_left: '/Minimalist_Living_Room.avif', hero_right: '/Modern_Minimalist_Living_Room.avif' }

const UNIVERS = [
  {
    slotKey: 'univers_1',
    title: 'Mariages & Réceptions',
    text: 'De la demande à la nuit de noces, une scénographie pensée dans le moindre détail.',
    img: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=80',
  },
  {
    slotKey: 'univers_2',
    title: 'Anniversaires & Fêtes',
    text: "Des célébrations sur mesure, intimes ou grandioses, à votre image.",
    img: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=900&q=80',
  },
  {
    slotKey: 'univers_3',
    title: 'Location de Décoration',
    text: 'Mobilier, art de la table et scénographie disponibles à la location, livrés et installés.',
    img: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=900&q=80',
  },
]

const PRESTATIONS = [
  { icon: 'fas fa-heart', title: 'Organisation de Mariage', text: "Recherche du lieu, prestataires, coordination du jour J." },
  { icon: 'fas fa-birthday-cake', title: "Organisation d'Anniversaire", text: 'Thème, décoration et animation sur mesure.' },
  { icon: 'fas fa-briefcase', title: 'Événements Professionnels', text: 'Séminaires, galas et lancements d\'entreprise.' },
  { icon: 'fas fa-star', title: 'Location de Décoration', text: 'Vaisselle, mobilier et éclairage, livrés et installés.' },
]

const VALEURS = [
  { icon: '/return.avif', title: 'Créativité Unique', text: 'Chaque événement est pensé et scénographié sur mesure.' },
  { icon: '/delivery-truck.avif', title: 'Installation & Logistique', text: 'Livraison, montage et démontage pris en charge de A à Z.' },
  { icon: '/customer-service.avif', title: 'Accompagnement 7j/7', text: 'Une équipe à votre écoute du premier échange au jour J.' },
  { icon: '/money-back.avif', title: 'Partenaires de Confiance', text: 'Un réseau de prestataires sélectionnés pour leur savoir-faire.' },
]

const REALISATIONS = [
  { slotKey: 'realisation_1', src: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80', label: 'Mariage' },
  { slotKey: 'realisation_2', src: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80', label: 'Mariage' },
  { slotKey: 'realisation_3', src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80', label: 'Anniversaire' },
  { slotKey: 'realisation_4', src: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80', label: 'Anniversaire' },
  { slotKey: 'realisation_5', src: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80', label: 'Événement Pro' },
  { slotKey: 'realisation_6', src: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80', label: 'Location Déco' },
]

const STATS = [
  { count: '150+', label: 'Fêtes Réussies' },
  { count: '120+', label: 'Couples Heureux' },
  { count: '5+', label: "Ans d'Expertise" },
  { count: '99%', label: 'Satisfaction Client' },
]

const TEMOIGNAGES = [
  { name: 'Camille & Julien', tag: 'Mariage — Juin 2025', quote: "Chaque détail était à sa place. Nous avons vécu notre journée sans aucun stress, tout était pensé d'avance." },
  { name: 'Isabelle M.', tag: 'Anniversaire — 50 ans', quote: "Une équipe à l'écoute qui a su transformer une simple idée en une soirée mémorable pour tous nos invités." },
  { name: 'Thomas R.', tag: 'Séminaire d\'entreprise', quote: 'Organisation impeccable du premier rendez-vous jusqu\'au rangement. Nous referons appel à eux.' },
]

export default function Home() {
  const router = useRouter()
  // The hero's entrance animation is handled with plain CSS below, driven
  // by this flag, so it plays reliably on arrival instead of depending on
  // a scroll-triggered observer (see the .hero-reveal rules in index.css).
  const [heroIn, setHeroIn] = useState(false)

  useEffect(() => {
    setHeroIn(false)
    let raf2
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setHeroIn(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [router.asPath])

  useEffect(() => {
    AOS.init({ duration: 820, easing: 'ease-in-out', once: true, offset: 55 })
    AOS.refresh()
  }, [])

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
    ]).then(([matRes, tierRes]) => {
      const tiers = groupTiersByMaterial(tierRes.data || [])
      setCatalogueTiers(tiers)
      const byCategory = {}
      ;(matRes.data || []).forEach(m => {
        const cat = m.category || 'Autre'
        if (!byCategory[cat]) byCategory[cat] = m
      })
      setCatalogueTeaser(Object.values(byCategory).slice(0, 4))
    })
  }, [])

  function handleQuickAdd(m) {
    const minQty = getMinOrderQty(catalogueTiers[String(m.id)])
    addToCatalogueCart(m.id, minQty)
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
      <Head>
        <title>OA Événementiel — Créateur d'Événements d'Exceptions</title>
        <meta
          name="description"
          content="Organisation de mariages, anniversaires, événements d'entreprise et location de décoration raffinée en Île-de-France."
        />
      </Head>

      <div className="page-wrapper">
        {/* HERO */}
        <section id="Hero-Section" className={`hero-section${heroIn ? ' hero-in' : ''}`}>
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
                      loading="lazy"
                      alt="Décoration de mariage raffinée"
                      src={images.hero_left || HERO_DEFAULTS.hero_left}
                      className="animated-image"
                    />
                  </div>
                  <div className="animated-image-wrapper two hero-reveal-img hero-reveal-img-2">
                    <img
                      loading="lazy"
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

        {/* NOS UNIVERS */}
        <section className="oa-section oa-univers">
          <div className="oa-container">
            <div className="oa-section-head" data-aos="fade-up">
              <span className="oa-eyebrow">Nos Univers</span>
              <h2 className="oa-heading" style={{ fontSize: 'var(--oa-size-h1)' }}>Un événement, une histoire</h2>
            </div>
            <div className="oa-univers-grid" data-aos="fade-up">
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
            <div className="oa-section-head" data-aos="fade-up">
              <span className="oa-eyebrow">Nos Prestations</span>
              <h2 className="oa-heading" style={{ fontSize: 'var(--oa-size-h1)' }}>Un accompagnement complet</h2>
            </div>
            <div className="oa-prestations-grid" data-aos="fade-up">
              {PRESTATIONS.map((p, i) => (
                <div className="oa-prestation-card" key={p.title}>
                  <div className="oa-prestation-icon"><i className={p.icon} /></div>
                  <h3 className="oa-heading" style={{ fontSize: '1.15rem' }}>{p.title}</h3>
                  <p className="oa-text-muted">{p.text}</p>
                </div>
              ))}
            </div>
            <div className="oa-center-cta" data-aos="fade-up">
              <Link href="/services" className="btn btn-rose-gold">Voir toutes nos prestations</Link>
            </div>
          </div>
        </section>

        {/* CATALOGUE */}
        {catalogueTeaser.length > 0 && (
          <section className="oa-section oa-section-tight oa-catalogue-teaser">
            <div className="oa-container">
              <div className="oa-section-head oa-section-head-split" data-aos="fade-up">
                <div>
                  <span className="oa-eyebrow">Catalogue</span>
                  <h2 className="oa-heading" style={{ fontSize: 'var(--oa-size-h1)' }}>Choisissez votre mobilier</h2>
                </div>
                <Link href="/catalogue" className="oa-univers-link">Voir tout le catalogue <i className="fas fa-arrow-right" /></Link>
              </div>
              <div className="oa-catalogue-teaser-grid" data-aos="fade-up">
                {catalogueTeaser.map(m => {
                  const tiers = catalogueTiers[String(m.id)]
                  const minQty = getMinOrderQty(tiers)
                  const price = getUnitPriceTtc(tiers, 'weekday', minQty)
                  const added = addedId === m.id
                  return (
                    <div className="oa-catalogue-teaser-card" key={m.id}>
                      <div className="oa-catalogue-teaser-img">
                        {m.image_url ? <img src={m.image_url} alt={m.name} loading="lazy" /> : <i className="fas fa-image" />}
                      </div>
                      <div className="oa-catalogue-teaser-body">
                        <h3 className="oa-heading" style={{ fontSize: '1.05rem' }}>{m.name}</h3>
                        {price > 0 && <span className="oa-catalogue-teaser-price">dès {price.toFixed(2)} €</span>}
                        <button
                          type="button"
                          className={`oa-catalogue-teaser-add${added ? ' is-added' : ''}`}
                          onClick={() => handleQuickAdd(m)}
                          disabled={added}
                        >
                          {added ? <><i className="fas fa-check" /> Ajouté</> : <><i className="fas fa-plus" /> Ajouter</>}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* POURQUOI OA */}
        <section className="feature-section">
          <div className="w-layout-blockcontainer container w-container">
            <div className="section-title-box" style={{ textAlign: 'center', marginBottom: 40 }} data-aos="fade-up">
              <div className="section-subtitle-box" style={{ justifyContent: 'center' }}>
                <div className="section-subtitle-icon"></div>
                <p className="section-subtitle">Pourquoi OA</p>
              </div>
              <h2 className="section-title">Ce qui guide chaque projet</h2>
            </div>
            <div className="w-layout-grid feature-grid" data-aos="fade-up">
              {VALEURS.map((v, i) => (
                <div className="feature-block" key={v.title}>
                  <img src={v.icon} loading="lazy" alt="" className="feature-icon" />
                  <h4 className="feature-title">{v.title}</h4>
                  <p className="feature-text">{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RÉALISATIONS */}
        <section className="oa-section oa-realisations">
          <div className="oa-container">
            <div className="oa-section-head oa-section-head-split" data-aos="fade-up">
              <div>
                <span className="oa-eyebrow">Réalisations</span>
                <h2 className="oa-heading" style={{ fontSize: 'var(--oa-size-h1)' }}>Quelques instants capturés</h2>
              </div>
              <Link href="/galerie" className="oa-univers-link">Voir la galerie <i className="fas fa-arrow-right" /></Link>
            </div>
            <div className="oa-realisations-carousel" data-aos="fade-up">
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
                  ref={realisationsTrackRef}
                  onTransitionEnd={handleRealisationsTransitionEnd}
                  style={{
                    transform: `translateX(-${realisationPos * realisationStep}px)`,
                    transition: realisationTransition ? 'transform .55s cubic-bezier(.16,.84,.44,1)' : 'none',
                  }}
                >
                  {[...REALISATIONS, ...REALISATIONS, ...REALISATIONS].map((r, i) => (
                    <Link href="/galerie" key={i} className="oa-realisation-item">
                      <img src={images[r.slotKey] || r.src} alt={r.label} loading="lazy" />
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
          <div className="oa-container oa-stats-grid" data-aos="fade-up">
            {STATS.map((s, i) => (
              <div className="oa-stat" key={s.label}>
                <span className="oa-stat-count">{s.count}</span>
                <span className="oa-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* TÉMOIGNAGES */}
        <section className="oa-section oa-temoignages">
          <div className="oa-container">
            <div className="oa-section-head" data-aos="fade-up">
              <span className="oa-eyebrow">Témoignages</span>
              <h2 className="oa-heading" style={{ fontSize: 'var(--oa-size-h1)' }}>Ils nous ont fait confiance</h2>
            </div>
            <div className="oa-temoignages-grid" data-aos="fade-up">
              {TEMOIGNAGES.map((t, i) => (
                <div className="oa-temoignage-card" key={t.name}>
                  <i className="fas fa-quote-left oa-quote-icon" />
                  <p className="oa-temoignage-quote">{t.quote}</p>
                  <div className="oa-temoignage-name">{t.name}</div>
                  <div className="oa-temoignage-tag oa-text-muted">{t.tag}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINALE */}
        <section className="apropos-cta-section">
          <div className="container">
            <h2 className="apropos-cta-title">Discutons de votre événement</h2>
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

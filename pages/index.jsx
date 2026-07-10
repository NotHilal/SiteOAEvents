import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade, Pagination } from 'swiper/modules'
import Lightbox from 'yet-another-react-lightbox'
import AOS from 'aos'
import Loader from '../src/components/Loader.jsx'
import Navbar from '../src/components/Navbar.jsx'
import Footer from '../src/components/Footer.jsx'

const HERO_SLIDES = [
  {
    bg: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1920&q=80',
    tagline: 'Organisatrice d\'Événements',
    title: 'Chaque Moment\nMérite d\'être\nExceptionnel',
    subtitle: 'Mariages · Anniversaires · Événements Pro',
  },
  {
    bg: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1920&q=80',
    tagline: 'Location & Décoration',
    title: 'Sublimez\nVos Espaces\nAvec Élégance',
    subtitle: 'Location de décoration · Mise en scène',
  },
]

const GALLERY_ITEMS = [
  { src: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80', label: 'Mariage' },
  { src: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80', label: 'Anniversaire' },
  { src: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80', label: 'Événement Pro' },
  { src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80', label: 'Décoration' },
  { src: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80', label: 'Réception' },
  { src: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80', label: 'Fleurs' },
]

const TESTIMONIALS = [
  { quote: 'Une organisation parfaite, des détails soignés, une équipe à l\'écoute. Notre mariage était exactement tel que nous l\'avions rêvé.', name: 'Sophie & Marc', event: 'Mariage — Versailles' },
  { quote: 'L\'anniversaire de ma fille a été une féerie. Les décors étaient magnifiques et l\'ambiance exactement ce que nous voulions.', name: 'Isabelle M.', event: 'Anniversaire — Paris' },
  { quote: 'Professionnalisme et créativité au rendez-vous. Notre événement d\'entreprise a impressionné tous nos partenaires.', name: 'Thomas R.', event: 'Événement Pro — La Défense' },
  { quote: 'Je recommande vivement ! Le soin apporté à chaque détail et la réactivité de l\'équipe ont fait de cet événement un souvenir inoubliable.', name: 'Camille D.', event: 'Mariage — Fontainebleau' },
]

const STATS = [
  { target: 150, suffix: '+', label: 'Événements organisés' },
  { target: 120, suffix: '+', label: 'Couples heureux' },
  { target: 5, suffix: '', label: 'Années d\'expérience' },
  { target: 99, suffix: '%', label: 'Clients satisfaits' },
]

export default function Home() {
  const statsRef = useRef(null)
  const [statValues, setStatValues] = useState(STATS.map(() => 0))
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.add('js-loaded')
    }
    AOS.init({ duration: 820, easing: 'ease-in-out', once: true, offset: 55 })
    AOS.refresh()
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('js-loaded')
      }
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      STATS.forEach((stat, i) => {
        const duration = 2600
        const start = performance.now()
        const tick = (now) => {
          const elapsed = now - start
          const progress = Math.min(elapsed / duration, 1)
          const value = Math.ceil(progress * stat.target)
          setStatValues(prev => { const next = [...prev]; next[i] = value; return next })
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
    }, { threshold: 0.3 })
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="site-wrap">
      <Loader />
      <Navbar />

      {/* HERO */}
      <section className="hero-slider hero-wrapper">
        <Swiper
          className="hero-swiper"
          modules={[Autoplay, EffectFade, Pagination]}
          effect="fade"
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          loop
          speed={1300}
        >
          {HERO_SLIDES.map((slide, i) => (
            <SwiperSlide key={i}>
              <div className="hero-slide" style={{ backgroundImage: `url('${slide.bg}')` }}>
                <div className="hero-overlay" />
                <div className="container">
                  <div className="row justify-content-center">
                    <div className="col-lg-8 col-md-10 text-center">
                      <div className="hero-content">
                        <span className="hero-tagline">{slide.tagline}</span>
                        <h1 className="hero-title" style={{ whiteSpace: 'pre-line' }}>{slide.title}</h1>
                        <p className="hero-subtitle">{slide.subtitle}</p>
                        <div className="hero-btns">
                          <Link href="/reservation" className="btn btn-rose-gold">Demander un devis</Link>
                          <Link href="/galerie" className="btn btn-outline-light">Voir la galerie</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* FEATURES BAR */}
      <div className="features-bar">
        <div className="container">
          <div className="row">
            {[
              { icon: 'fas fa-heart', title: 'Personnalisation', desc: 'Chaque événement est unique, conçu selon vos désirs' },
              { icon: 'fas fa-award', title: 'Excellence', desc: 'Un service haut de gamme du début à la fin' },
              { icon: 'fas fa-clock', title: 'Réactivité', desc: 'Disponible et à votre écoute 7j/7' },
              { icon: 'fas fa-leaf', title: 'Éco-responsable', desc: 'Des choix durables pour vos événements' },
            ].map((f, i) => (
              <div key={i} className="col-md-3" data-aos="fade-up" data-aos-delay={i * 80}>
                <div className="feature-item">
                  <div className="feature-icon"><i className={f.icon} /></div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ABOUT */}
      <section className="section-about" id="about">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-5 mb-lg-0" data-aos="fade-right">
              <div className="about-image-wrap">
                <img
                  src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80"
                  alt="OA Événementiel"
                  className="about-image"
                />
                <div className="about-badge">
                  <span className="number">5+</span>
                  <span className="label">Années d'expérience</span>
                </div>
              </div>
            </div>
            <div className="col-lg-6 ps-lg-5" data-aos="fade-left" data-aos-delay="100">
              <span className="section-subtitle">Notre histoire</span>
              <h2 className="section-title">L'Art de Sublimer Vos Moments</h2>
              <p className="section-text">
                Fondée avec passion, OA Événementiel accompagne particuliers et professionnels dans la création d'événements mémorables. Notre approche allie créativité, rigueur et attention aux détails pour dépasser vos attentes.
              </p>
              <p className="section-text">
                De la conception à la réalisation, nous prenons en charge chaque aspect de votre événement pour vous permettre de profiter pleinement de chaque instant.
              </p>
              <ul className="about-list">
                <li><i className="fas fa-check-circle" />Organisation complète ou partielle</li>
                <li><i className="fas fa-check-circle" />Large gamme de décoration à la location</li>
                <li><i className="fas fa-check-circle" />Réseau de prestataires de qualité</li>
                <li><i className="fas fa-check-circle" />Accompagnement personnalisé</li>
              </ul>
              <Link href="/contact" className="btn btn-rose-gold">Nous contacter</Link>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section-services bg-light-bg">
        <div className="container">
          <div className="row justify-content-center text-center mb-5">
            <div className="col-lg-7">
              <span className="section-subtitle">Ce que nous faisons</span>
              <h2 className="section-title">Nos Prestations</h2>
              <p className="section-lead">Découvrez notre gamme complète de services pour faire de votre événement un moment inoubliable.</p>
            </div>
          </div>
          <div className="row">
            {[
              { icon: 'fas fa-rings-wedding', img: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80', title: 'Mariage', desc: 'Organisation complète ou partielle de votre mariage, pour un jour J parfait à chaque détail.' },
              { icon: 'fas fa-birthday-cake', img: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80', title: 'Anniversaire', desc: 'Célébrez chaque étape de la vie avec faste et originalité grâce à notre expertise.' },
              { icon: 'fas fa-briefcase', img: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80', title: 'Événement Pro', desc: 'Séminaires, galas, inaugurations : valorisez votre image avec un événement professionnel soigné.' },
              { icon: 'fas fa-star', img: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&q=80', title: 'Location Déco', desc: 'Louez notre belle sélection de décorations pour sublimer vos espaces sans effort.' },
            ].map((s, i) => (
              <div key={i} className="col-md-6 col-lg-3 mb-4" data-aos="fade-up" data-aos-delay={i * 80}>
                <div className="service-card h-100">
                  <div className="service-image">
                    <img src={s.img} alt={s.title} />
                    <div className="service-overlay">
                      <Link href="/services" className="service-overlay-link">Découvrir</Link>
                    </div>
                  </div>
                  <div className="service-body">
                    <div className="service-icon"><i className={s.icon} /></div>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <Link href="/services" className="btn btn-outline-rose-gold">Voir toutes nos prestations</Link>
          </div>
        </div>
      </section>

      {/* GALLERY PREVIEW */}
      <section className="section-gallery">
        <div className="container">
          <div className="row justify-content-center text-center mb-5">
            <div className="col-lg-7">
              <span className="section-subtitle">Notre portfolio</span>
              <h2 className="section-title">Nos Réalisations</h2>
              <p className="section-lead">Un aperçu de nos plus belles créations, reflet de notre passion pour l'événementiel.</p>
            </div>
          </div>
          <div className="row gallery-grid">
            {GALLERY_ITEMS.map((item, i) => (
              <div key={i} className="col-md-4 gallery-item" data-aos="fade-up" data-aos-delay={i * 60}>
                <button
                  className="gallery-link w-100 border-0 p-0"
                  onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
                >
                  <img src={item.src} alt={item.label} />
                  <div className="gallery-overlay">
                    <i className="fas fa-search-plus" />
                    <span>{item.label}</span>
                  </div>
                </button>
              </div>
            ))}
          </div>
          <div className="text-center mt-5">
            <Link href="/galerie" className="btn btn-rose-gold">Voir toute la galerie</Link>
          </div>
        </div>
      </section>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={GALLERY_ITEMS.map(g => ({ src: g.src }))}
      />

      {/* TESTIMONIALS */}
      <section className="section-testimonials bg-light-bg">
        <div className="container">
          <div className="row justify-content-center text-center mb-5">
            <div className="col-lg-7">
              <span className="section-subtitle">Ils nous font confiance</span>
              <h2 className="section-title">Ce Que Disent Nos Clients</h2>
            </div>
          </div>
          <div className="row">
            {TESTIMONIALS.slice(0, 2).map((t, i) => (
              <div key={i} className="col-md-6 mb-4" data-aos="fade-up" data-aos-delay={i * 100}>
                <TestimonialCard {...t} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="section-stats" ref={statsRef}>
        <div className="container">
          <div className="row justify-content-center">
            {STATS.map((s, i) => (
              <div key={i} className="col-6 col-md-3">
                <div className="stat-item">
                  <span className="stat-number">
                    {statValues[i]}{s.suffix}
                  </span>
                  <span className="stat-label">{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-cta">
        <div className="container">
          <span className="cta-tagline">Votre événement de rêve</span>
          <h2 className="cta-title">Prêt à Créer Quelque Chose d'Extraordinaire ?</h2>
          <p className="cta-text">Contactez-nous dès aujourd'hui pour discuter de votre projet et recevoir une proposition personnalisée.</p>
          <div className="d-flex justify-content-center gap-3 flex-wrap mt-4">
            <Link href="/reservation" className="btn btn-white-gold">Faire une demande</Link>
            <Link href="/contact" className="btn btn-outline-light">Nous contacter</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function TestimonialCard({ quote, name, event }) {
  return (
    <div className="testimonial-item">
      <div className="testimonial-quote-icon">"</div>
      <div className="testimonial-stars">★★★★★</div>
      <blockquote>"{quote}"</blockquote>
      <div className="testimonial-author">
        <div className="testimonial-avatar"><i className="fas fa-user" /></div>
        <div>
          <p className="testimonial-author-name">{name}</p>
          <span className="testimonial-author-event">{event}</span>
        </div>
      </div>
    </div>
  )
}

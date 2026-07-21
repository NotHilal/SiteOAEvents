import { useEffect, useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  // The hero's entrance animation is handled with plain CSS below, driven
  // by this flag — not by Webflow's IX2 engine. IX2's "scrolled into view"
  // triggers run off an IntersectionObserver that only re-evaluates on a
  // real scroll, so above-the-fold content never played its reveal on
  // arrival (only after the visitor scrolled by hand). Below-the-fold
  // sections still use Webflow's own scroll-triggered reveal, which works
  // fine since the visitor genuinely scrolls to them.
  const [heroIn, setHeroIn] = useState(false)

  useEffect(() => {
    setHeroIn(false)
    // Double rAF: let the "hidden" state paint first, then flip to visible
    // on the next frame so the CSS transition actually has something to
    // animate from instead of mounting already-visible.
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
    if (typeof window === 'undefined') return
    const initWebflow = () => {
      if (window.Webflow) {
        window.Webflow.destroy()
        window.Webflow.ready()
        if (window.Webflow.require('ix2')) {
          window.Webflow.require('ix2').init()
        }
      }
    }
    const timer = setTimeout(initWebflow, 500)
    return () => clearTimeout(timer)
  }, [router.asPath])

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
        {/* HERO SECTION */}
        <section id="Hero-Section" className={`hero-section${heroIn ? ' hero-in' : ''}`}>
          <div className="hero-wrapper">
            <img
              className="hero-shape hero-reveal"
              src="/grey-layer-vector-file.avif"
              alt="Gray abstract wavy layers overlapping on a white background."
              sizes="(max-width: 3160px) 100vw, 3160px"
              loading="lazy"
            />
            <div className="w-layout-blockcontainer container w-container">
              <div className="w-layout-grid hero-grid">
                <div id="w-node-a700dc79-8fd1-f214-1ce4-921fd4d20a0a-a9047b99" className="hero-content">
                  <div className="section-subtitle-box hero-reveal hero-reveal-1">
                    <div className="section-subtitle-icon"></div>
                    <p className="section-subtitle">Créateur d'Émotions</p>
                  </div>
                  <h1 className="hero-title hero-reveal hero-reveal-2">
                    Organisation & Scénographie d'Événements
                  </h1>
                  <p className="hero-text hero-reveal hero-reveal-3">
                    Mariages, anniversaires, réceptions privées ou professionnelles... Nous concevons et décors vos plus beaux moments en Île-de-France.
                  </p>
                  <div className="hero-btn-box hero-reveal hero-reveal-4">
                    <Link
                      href="/reservation"
                      data-wf--primary-button--variant="base"
                      data-w-id="08c8af99-e448-a937-dcfa-7ee6c8bdc474"
                      className="theme-button w-inline-block"
                    >
                      <div className="theme-button-content">
                        <div className="theme-button-text">Réserver</div>
                        <div className="theme-button-hover-text">Réserver</div>
                      </div>
                    </Link>
                    <Link
                      href="/services"
                      data-wf--primary-button--variant="bordered"
                      data-w-id="08c8af99-e448-a937-dcfa-7ee6c8bdc474"
                      className="theme-button w-variant-40f1ff1b-cc50-864a-b04b-b59d856f7154 w-inline-block"
                    >
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
                      style={{ transform: 'translate3d(0, 0, 0) scale3d(1.5, 1.5, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }}
                      loading="lazy"
                      alt="Minimalist living room"
                      src="/Minimalist_Living_Room.avif"
                      className="animated-image"
                    />
                  </div>
                  <div className="animated-image-wrapper two hero-reveal-img hero-reveal-img-2">
                    <img
                      style={{ transform: 'translate3d(0, 0, 0) scale3d(1.5, 1.5, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)' }}
                      loading="lazy"
                      alt="Modern Minimalist Living Room"
                      src="/Modern_Minimalist_Living_Room.avif"
                      className="animated-image"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORY SECTION */}
        <section id="Category-Section" className="category-section">
          <div className="w-layout-blockcontainer container-large w-container">
            <div className="w-layout-grid category-grid">
              <div className="w-dyn-list">
                <div role="list" className="w-dyn-items">
                  <div role="listitem" className="w-dyn-item">
                    <div data-w-id="bba256eb-68d4-ad46-c076-72cb6f47d659" style={{ opacity: 0 }} className="category-box">
                      <div className="category-content">
                        <p className="category-subtitle">120+ Heureux</p>
                        <h2 className="category-title">Mariages & Réceptions</h2>
                        <Link href="/services" className="readmore-btn w-inline-block">
                          <div className="readmore-btn-text">Découvrir</div>
                          <div className="readmore-btn-icon"></div>
                        </Link>
                      </div>
                      <img
                        src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80"
                        loading="lazy"
                        alt="Weddings"
                        className="category-image"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div id="w-node-b2596ba8-114d-cd49-4fc6-274eff7b31ed-a9047b99" className="category-outer">
                <div data-w-id="b2596ba8-114d-cd49-4fc6-274eff7b31ee" style={{ opacity: 0 }} className="category-discount-box">
                  <div className="section-title-box center mb-zero">
                    <div className="section-subtitle-box">
                      <div className="section-subtitle-icon light"></div>
                      <p className="section-subtitle light">Chaque détail compte</p>
                    </div>
                    <h3 className="section-title two">Prestations d'Exception</h3>
                  </div>
                </div>
                <div className="w-dyn-list">
                  <div role="list" className="w-dyn-items">
                    <div role="listitem" className="w-dyn-item">
                      <div data-w-id="9d95f539-26af-1b04-b86f-c51f3f70024c" style={{ opacity: 0 }} className="category-box two">
                        <div className="category-content">
                          <p className="category-subtitle">150+ Fêtes Réussies</p>
                          <h2 className="category-title">Anniversaires & Fêtes</h2>
                          <Link href="/services" className="readmore-btn w-inline-block">
                            <div className="readmore-btn-text">Découvrir</div>
                            <div className="readmore-btn-icon"></div>
                          </Link>
                        </div>
                        <img
                          src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80"
                          loading="lazy"
                          alt="Birthdays"
                          className="category-image two"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-dyn-list">
                <div role="list" className="w-dyn-items">
                  <div role="listitem" className="w-dyn-item">
                    <div data-w-id="2688828f-26c5-e597-4953-e250ad8b8937" style={{ opacity: 0 }} className="category-box">
                      <div className="category-content">
                        <p className="category-subtitle">Catalogue de Décors</p>
                        <h2 className="category-title">Location de Décoration</h2>
                        <Link href="/services" className="readmore-btn w-inline-block">
                          <div className="readmore-btn-text">Découvrir</div>
                          <div className="readmore-btn-icon"></div>
                        </Link>
                      </div>
                      <img
                        src="https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80"
                        loading="lazy"
                        alt="Decorations"
                        className="category-image"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRESTATIONS / PRODUCT SECTION THREE */}
        <section id="Product-Section-Three" className="product-section-three pb-zero">
          <div className="w-layout-blockcontainer container w-container">
            <div data-w-id="c0967809-4186-a72a-c011-781615ace63c" style={{ opacity: 0 }} className="section-title-box center">
              <div className="section-subtitle-box">
                <div className="section-subtitle-icon"></div>
                <p className="section-subtitle">Prestations</p>
              </div>
              <h2 className="section-title">Services Clés en Main</h2>
              <p className="section-text">
                Découvrez notre large éventail de prestations pour faire de votre jour J un moment inoubliable.
              </p>
            </div>
            <div data-w-id="c2c88199-c101-0c34-e41e-ea94ca0e3e78" style={{ opacity: 0 }} className="w-dyn-list">
              <div role="list" className="collection-list-three w-dyn-items">
                
                {/* Card 1 */}
                <div role="listitem" className="w-dyn-item">
                  <div data-w-id="2b7e6c21-626f-e1d3-fc9b-3c43eac2b88b" style={{ opacity: 0 }} className="product-block-three">
                    <div style={{ transform: 'scale3d(1, 0, 1)' }} className="bg product-three-bg"></div>
                    <div className="product-three-image-box">
                      <div className="product-three-image-link">
                        <img style={{ opacity: 1 }} alt="" loading="lazy" src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80" className="product-three-image" />
                        <img style={{ opacity: 0 }} alt="" loading="lazy" src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80" className="product-three-image hover-image" />
                      </div>
                      <div style={{ opacity: 0 }} className="product-btn-box">
                        <Link href="/services" className="product-detail-btn">Découvrir</Link>
                      </div>
                    </div>
                    <div className="product-three-content">
                      <Link href="/services" className="product-three-title-link w-inline-block">
                        <h3 className="product-three-title">Organisation Mariage</h3>
                      </Link>
                      <p style={{ color: 'rgb(0,0,0)' }} className="product-three-price">Sur Devis</p>
                      <div className="rating-box">
                        <p className="rating-text">5.0</p>
                        <div className="rating-star">★</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2 */}
                <div role="listitem" className="w-dyn-item">
                  <div data-w-id="2b7e6c21-626f-e1d3-fc9b-3c43eac2b88b" style={{ opacity: 0 }} className="product-block-three">
                    <div style={{ transform: 'scale3d(1, 0, 1)' }} className="bg product-three-bg"></div>
                    <div className="product-three-image-box">
                      <div className="product-three-image-link">
                        <img style={{ opacity: 1 }} alt="" loading="lazy" src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80" className="product-three-image" />
                        <img style={{ opacity: 0 }} alt="" loading="lazy" src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80" className="product-three-image hover-image" />
                      </div>
                      <div style={{ opacity: 0 }} className="product-btn-box">
                        <Link href="/services" className="product-detail-btn">Découvrir</Link>
                      </div>
                    </div>
                    <div className="product-three-content">
                      <Link href="/services" className="product-three-title-link w-inline-block">
                        <h3 className="product-three-title">Anniversaires</h3>
                      </Link>
                      <p style={{ color: 'rgb(0,0,0)' }} className="product-three-price">Sur Devis</p>
                      <div className="rating-box">
                        <p className="rating-text">4.9</p>
                        <div className="rating-star">★</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3 */}
                <div role="listitem" className="w-dyn-item">
                  <div data-w-id="2b7e6c21-626f-e1d3-fc9b-3c43eac2b88b" style={{ opacity: 0 }} className="product-block-three">
                    <div style={{ transform: 'scale3d(1, 0, 1)' }} className="bg product-three-bg"></div>
                    <div className="product-three-image-box">
                      <div className="product-three-image-link">
                        <img style={{ opacity: 1 }} alt="" loading="lazy" src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80" className="product-three-image" />
                        <img style={{ opacity: 0 }} alt="" loading="lazy" src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80" className="product-three-image hover-image" />
                      </div>
                      <div style={{ opacity: 0 }} className="product-btn-box">
                        <Link href="/services" className="product-detail-btn">Découvrir</Link>
                      </div>
                    </div>
                    <div className="product-three-content">
                      <Link href="/services" className="product-three-title-link w-inline-block">
                        <h3 className="product-three-title">Séminaires & Galas</h3>
                      </Link>
                      <p style={{ color: 'rgb(0,0,0)' }} className="product-three-price">Sur Devis</p>
                      <div className="rating-box">
                        <p className="rating-text">5.0</p>
                        <div className="rating-star">★</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4 */}
                <div role="listitem" className="w-dyn-item">
                  <div data-w-id="2b7e6c21-626f-e1d3-fc9b-3c43eac2b88b" style={{ opacity: 0 }} className="product-block-three">
                    <div style={{ transform: 'scale3d(1, 0, 1)' }} className="bg product-three-bg"></div>
                    <div className="product-three-image-box">
                      <div className="product-three-image-link">
                        <img style={{ opacity: 1 }} alt="" loading="lazy" src="https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&q=80" className="product-three-image" />
                        <img style={{ opacity: 0 }} alt="" loading="lazy" src="https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&q=80" className="product-three-image hover-image" />
                      </div>
                      <div style={{ opacity: 0 }} className="product-btn-box">
                        <Link href="/services" className="product-detail-btn">Découvrir</Link>
                      </div>
                    </div>
                    <div className="product-three-content">
                      <Link href="/services" className="product-three-title-link w-inline-block">
                        <h3 className="product-three-title">Location Mobilier</h3>
                      </Link>
                      <p style={{ color: 'rgb(0,0,0)' }} className="product-three-price">À partir de 50€</p>
                      <div className="rating-box">
                        <p className="rating-text">4.8</p>
                        <div className="rating-star">★</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 5 */}
                <div role="listitem" className="w-dyn-item">
                  <div data-w-id="2b7e6c21-626f-e1d3-fc9b-3c43eac2b88b" style={{ opacity: 0 }} className="product-block-three">
                    <div style={{ transform: 'scale3d(1, 0, 1)' }} className="bg product-three-bg"></div>
                    <div className="product-three-image-box">
                      <div className="product-three-image-link">
                        <img style={{ opacity: 1 }} alt="" loading="lazy" src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&q=80" className="product-three-image" />
                        <img style={{ opacity: 0 }} alt="" loading="lazy" src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&q=80" className="product-three-image hover-image" />
                      </div>
                      <div style={{ opacity: 0 }} className="product-btn-box">
                        <Link href="/services" className="product-detail-btn">Découvrir</Link>
                      </div>
                    </div>
                    <div className="product-three-content">
                      <Link href="/services" className="product-three-title-link w-inline-block">
                        <h3 className="product-three-title">Baptêmes & Baby Showers</h3>
                      </Link>
                      <p style={{ color: 'rgb(0,0,0)' }} className="product-three-price">Sur Devis</p>
                      <div className="rating-box">
                        <p className="rating-text">4.9</p>
                        <div className="rating-star">★</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* PORTFOLIO CAROUSEL (WEBFLOW CAROUSEL MOTOR) */}
        <section className="project-section pb-zero">
          <div className="w-layout-grid project-grid">
            <div data-w-id="43c4c0ad-5afb-9abb-d813-443476b04144" style={{ opacity: 0 }} className="project-title-box">
              <div className="project-title-inner">
                <div className="section-title-box">
                  <h2 className="section-title light">Inspirations Uniques</h2>
                  <p className="section-text project-section-text">
                    Un aperçu de nos plus belles scénographies et d'événements orchestrés avec passion.
                  </p>
                </div>
                <Link href="/galerie" className="theme-button w-variant-534531f6-c281-d1ea-aac9-91a4e765c207 w-inline-block">
                  <div className="theme-button-content">
                    <div className="theme-button-text">Voir la Galerie</div>
                    <div className="theme-button-hover-text">Voir la Galerie</div>
                  </div>
                </Link>
              </div>
              <img src="/grey-layer.avif" loading="lazy" alt="" className="project-shape" />
            </div>
            
            <div className="project-slider-box">
              <div
                data-delay="4000"
                data-animation="slide"
                className="project-slider w-slider"
                data-autoplay="true"
                data-easing="ease"
                data-hide-arrows="false"
                data-disable-swipe="false"
                data-w-id="f68693eb-2606-b15a-0804-958ddeffe80f"
                data-autoplay-limit="0"
                data-nav-spacing="3"
                data-duration="500"
                data-infinite="true"
              >
                <div className="project-mask w-slider-mask">
                  
                  {/* Slide 1 */}
                  <div className="project-slide w-slide">
                    <div data-w-id="f68693eb-2606-b15a-0804-958ddeffe812" className="project-block">
                      <div className="project-image-box">
                        <img loading="lazy" src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80" alt="" className="project-image" />
                      </div>
                      <div style={{ transform: 'translate3d(0, 100%, 0)', opacity: 0 }} className="project-content-box">
                        <p className="project-subtitle">01 ----- Mariage</p>
                        <h3 className="project-title">Château de Versailles</h3>
                      </div>
                      <div style={{ opacity: 0 }} className="readmore-button-box">
                        <Link href="/galerie" className="readmore-two w-inline-block">
                          <div className="readmore-icon"></div>
                        </Link>
                        <img loading="lazy" src="/leaf-shape.svg" alt="" className="shape top-right rotate" />
                        <img loading="lazy" src="/leaf-shape.svg" alt="" className="shape bottom-right rotate" />
                      </div>
                    </div>
                  </div>

                  {/* Slide 2 */}
                  <div className="project-slide w-slide">
                    <div data-w-id="f68693eb-2606-b15a-0804-958ddeffe820" className="project-block">
                      <div className="project-image-box">
                        <img loading="lazy" src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80" alt="" className="project-image" />
                      </div>
                      <div style={{ transform: 'translate3d(0, 100%, 0)', opacity: 0 }} className="project-content-box">
                        <p className="project-subtitle">02 ----- Décoration</p>
                        <h3 className="project-title">Esprit Champêtre Chic</h3>
                      </div>
                      <div style={{ opacity: 0 }} className="readmore-button-box">
                        <Link href="/galerie" className="readmore-two w-inline-block">
                          <div className="readmore-icon"></div>
                        </Link>
                        <img loading="lazy" src="/leaf-shape.svg" alt="" className="shape top-right rotate" />
                        <img loading="lazy" src="/leaf-shape.svg" alt="" className="shape bottom-right rotate" />
                      </div>
                    </div>
                  </div>

                  {/* Slide 3 */}
                  <div className="project-slide w-slide">
                    <div data-w-id="f68693eb-2606-b15a-0804-958ddeffe82e" className="project-block">
                      <div className="project-image-box">
                        <img loading="lazy" src="https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80" alt="" className="project-image" />
                      </div>
                      <div style={{ transform: 'translate3d(0, 100%, 0)', opacity: 0 }} className="project-content-box">
                        <p className="project-subtitle">03 ----- Professionnel</p>
                        <h3 className="project-title">Gala de Prestige</h3>
                      </div>
                      <div style={{ opacity: 0 }} className="readmore-button-box">
                        <Link href="/galerie" className="readmore-two w-inline-block">
                          <div className="readmore-icon"></div>
                        </Link>
                        <img loading="lazy" src="/leaf-shape.svg" alt="" className="shape top-right rotate" />
                        <img loading="lazy" src="/leaf-shape.svg" alt="" className="shape bottom-right rotate" />
                      </div>
                    </div>
                  </div>

                  {/* Slide 4 */}
                  <div className="project-slide w-slide">
                    <div data-w-id="e0d5b834-de1d-92e6-6720-7dade22511a2" className="project-block">
                      <div className="project-image-box">
                        <img loading="lazy" src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80" alt="" className="project-image" />
                      </div>
                      <div style={{ transform: 'translate3d(0, 100%, 0)', opacity: 0 }} className="project-content-box">
                        <p className="project-subtitle">04 ----- Baptême</p>
                        <h3 className="project-title">Décoration Douce & Florale</h3>
                      </div>
                      <div style={{ opacity: 0 }} className="readmore-button-box">
                        <Link href="/galerie" className="readmore-two w-inline-block">
                          <div className="readmore-icon"></div>
                        </Link>
                        <img loading="lazy" src="/leaf-shape.svg" alt="" className="shape top-right rotate" />
                        <img loading="lazy" src="/leaf-shape.svg" alt="" className="shape bottom-right rotate" />
                      </div>
                    </div>
                  </div>

                  {/* Slide 5 */}
                  <div className="project-slide w-slide">
                    <div data-w-id="335005ba-cebe-d69f-6d48-a67a002d86b7" className="project-block">
                      <div className="project-image-box">
                        <img loading="lazy" src="https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80" alt="" className="project-image" />
                      </div>
                      <div style={{ transform: 'translate3d(0, 100%, 0)', opacity: 0 }} className="project-content-box">
                        <p className="project-subtitle">05 ----- Réception</p>
                        <h3 className="project-title">Esprit Guinguette Chic</h3>
                      </div>
                      <div style={{ opacity: 0 }} className="readmore-button-box">
                        <Link href="/galerie" className="readmore-two w-inline-block">
                          <div className="readmore-icon"></div>
                        </Link>
                        <img loading="lazy" src="/leaf-shape.svg" alt="" className="shape top-right rotate" />
                        <img loading="lazy" src="/leaf-shape.svg" alt="" className="shape bottom-right rotate" />
                      </div>
                    </div>
                  </div>

                  {/* Slide 6 */}
                  <div className="project-slide w-slide">
                    <div data-w-id="bd002e77-e5e0-8b5f-3406-4da483106f85" className="project-block">
                      <div className="project-image-box">
                        <img loading="lazy" src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80" alt="" className="project-image" />
                      </div>
                      <div style={{ transform: 'translate3d(0, 100%, 0)', opacity: 0 }} className="project-content-box">
                        <p className="project-subtitle">06 ----- Fleurs</p>
                        <h3 className="project-title">Arche Florale Romantique</h3>
                      </div>
                      <div style={{ opacity: 0 }} className="readmore-button-box">
                        <Link href="/galerie" className="readmore-two w-inline-block">
                          <div className="readmore-icon"></div>
                        </Link>
                        <img loading="lazy" src="/leaf-shape.svg" alt="" className="shape top-right rotate" />
                        <img loading="lazy" src="/leaf-shape.svg" alt="" className="shape bottom-right rotate" />
                      </div>
                    </div>
                  </div>

                </div>
                <div className="project-left-arrow w-slider-arrow-left">
                  <div className="project-slider-icon"></div>
                </div>
                <div style={{ opacity: 0.5 }} className="project-right-arrow w-slider-arrow-right">
                  <div className="project-slider-icon"></div>
                </div>
                <div className="project-dots w-slider-nav w-slider-nav-invert w-round"></div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SECTION */}
        <section className="feature-section">
          <div className="w-layout-blockcontainer container w-container">
            <div className="w-layout-grid feature-grid">
              
              <div data-w-id="1cefc13e-28fb-376b-67fd-6a313dfad748" style={{ opacity: 0 }} className="feature-block">
                <img src="/return.avif" loading="lazy" alt="Floral details icon" className="feature-icon" />
                <h4 style={{ color: 'rgb(0,0,0)' }} className="feature-title">Créativité unique</h4>
                <p style={{ color: 'rgb(0,0,0)' }} className="feature-text">Des concepts de décoration sur-mesure imaginés pour vous.</p>
              </div>
              
              <div id="w-node-_1cefc13e-28fb-376b-67fd-6a313dfad74e-a9047b99" data-w-id="1cefc13e-28fb-376b-67fd-6a313dfad74e" style={{ opacity: 0 }} className="feature-block">
                <img src="/delivery-truck.avif" loading="lazy" alt="Installation delivery truck" className="feature-icon" />
                <h4 style={{ color: 'rgb(0,0,0)' }} className="feature-title">Installation & Logistique</h4>
                <p style={{ color: 'rgb(0,0,0)' }} className="feature-text">Installation de tout le mobilier et décors sur le lieu de réception.</p>
              </div>
              
              <div data-w-id="1cefc13e-28fb-376b-67fd-6a313dfad754" style={{ opacity: 0 }} className="feature-block">
                <img src="/customer-service.avif" loading="lazy" alt="Support icon" className="feature-icon" />
                <h4 style={{ color: 'rgb(0,0,0)' }} className="feature-title">Accompagnement 7j/7</h4>
                <p style={{ color: 'rgb(0,0,0)' }} className="feature-text">Un suivi attentif et réactif tout au long du projet.</p>
              </div>
              
              <div data-w-id="1cefc13e-28fb-376b-67fd-6a313dfad75a" style={{ opacity: 0 }} className="feature-block">
                <img src="/money-back.avif" loading="lazy" alt="Partner guarantee badge" className="feature-icon" />
                <h4 style={{ color: 'rgb(0,0,0)' }} className="feature-title">Partenaires de Confiance</h4>
                <p style={{ color: 'rgb(0,0,0)' }} className="feature-text">Accès à notre réseau de prestataires sélectionnés.</p>
              </div>

            </div>
          </div>
        </section>

        {/* IMAGE SECTION */}
        <section className="image-section">
          <div className="image-wrapper">
            <div className="parallex-image-outer">
              <img
                data-w-id="acba39ba-5c92-b8c6-fd02-4ec420453a98"
                sizes="(max-width: 1920px) 100vw, 1920px"
                alt="Beautiful event reception hall view"
                src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1920&q=80"
                loading="lazy"
                className="parallex-image"
              />
            </div>
            <div className="image-content-wrap">
              <p className="image-title">Créateurs de Souvenirs</p>
              <p className="image-text">Votre vision de l'événement prend vie sous vos yeux.</p>
            </div>
          </div>
        </section>

        {/* SPECIAL PROMO / CTA SECTION */}
        <section className="super-sales-section">
          <div className="w-layout-blockcontainer container w-container">
            <div className="w-layout-grid sales-grid">
              
              <div className="w-dyn-list">
                <div role="list" className="collection-list w-dyn-items">
                  
                  <div role="listitem" className="collection-item w-dyn-item">
                    <Link href="/services" data-w-id="83284315-6f47-659c-6404-57d5fd63d373" style={{ opacity: 0 }} className="sale-block one w-inline-block">
                      <h4 className="sale-title">Prestations Mariage</h4>
                      <img src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80" alt="" loading="lazy" className="sale-image two" />
                      <p className="sale-price">Découvrir la formule</p>
                    </Link>
                  </div>
                  
                  <div role="listitem" className="collection-item w-dyn-item">
                    <Link href="/services" data-w-id="83284315-6f47-659c-6404-57d5fd63d373" style={{ opacity: 0 }} className="sale-block one w-inline-block">
                      <h4 className="sale-title">Prestations Anniversaire</h4>
                      <img src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80" alt="" loading="lazy" className="sale-image two" />
                      <p className="sale-price">Découvrir la formule</p>
                    </Link>
                  </div>

                </div>
              </div>

              <div className="w-dyn-list">
                <div role="list" className="collection-list w-dyn-items">
                  <div role="listitem" className="w-dyn-item">
                    <Link href="/contact" data-w-id="6e6dcca0-435e-ba66-760b-4410392064c9" style={{ opacity: 0 }} className="sale-block two w-inline-block">
                      <h2 className="sale-title-two">RDV Conseil Offert !</h2>
                      <p className="sale-text">Bénéficiez d'une première consultation gratuite pour échanger sur vos projets.</p>
                      <p className="sale-end-time">Offre Limitée</p>
                      <div className="countdown-outer">
                        <div className="countdown-box">
                          <p className="countdown-count">05</p>
                          <p className="countdown-text">jours</p>
                        </div>
                        <p className="countdown-colon">:</p>
                        <div className="countdown-box">
                          <p className="countdown-count">14</p>
                          <p className="countdown-text">heures</p>
                        </div>
                        <p className="countdown-colon">:</p>
                        <div className="countdown-box">
                          <p className="countdown-count">20</p>
                          <p className="countdown-text">mins</p>
                        </div>
                        <p className="countdown-colon">:</p>
                        <div className="countdown-box">
                          <p className="countdown-count">30</p>
                          <p className="countdown-text">secs</p>
                        </div>
                      </div>
                      <img src="https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80" alt="" loading="lazy" className="sale-image" />
                      <p className="sale-price">Prendre Rendez-vous</p>
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* MARQUEE SECTION */}
        <section className="marquee-secton">
          <div className="marquee-box">
            <div className="marquee-inner">
              <div className="marquee">
                <p className="marquee-text">ORGANISATION & DÉCORATION D'ÉVÉNEMENTS.</p>
                <img loading="lazy" src="/sofa-icon.avif" alt="decor decoration sofa icon" className="marquee-icon" />
                <p className="marquee-text">SCÉNOGRAPHIES UNIQUES ET RAFFINÉES.</p>
                <img loading="lazy" src="/chair-icon.png" alt="decor decoration chair icon" className="marquee-icon" />
                <p className="marquee-text">LOCATION DE MOBILIER DE PRESTIGE.</p>
                <img loading="lazy" src="/sofa-icon.avif" alt="decor decoration chair design icon" className="marquee-icon" />
              </div>
              <div className="marquee">
                <p className="marquee-text">ORGANISATION & DÉCORATION D'ÉVÉNEMENTS.</p>
                <img loading="lazy" src="/sofa-icon.avif" alt="decor decoration sofa icon" className="marquee-icon" />
                <p className="marquee-text">SCÉNOGRAPHIES UNIQUES ET RAFFINÉES.</p>
                <img loading="lazy" src="/chair-icon.png" alt="decor decoration chair icon" className="marquee-icon" />
                <p className="marquee-text">LOCATION DE MOBILIER DE PRESTIGE.</p>
                <img loading="lazy" src="/sofa-icon.avif" alt="decor decoration chair design icon" className="marquee-icon" />
              </div>
              <div className="marquee">
                <p className="marquee-text">ORGANISATION & DÉCORATION D'ÉVÉNEMENTS.</p>
                <img loading="lazy" src="/sofa-icon.avif" alt="decor decoration sofa icon" className="marquee-icon" />
                <p className="marquee-text">SCÉNOGRAPHIES UNIQUES ET RAFFINÉES.</p>
                <img loading="lazy" src="/chair-icon.png" alt="decor decoration chair icon" className="marquee-icon" />
                <p className="marquee-text">LOCATION DE MOBILIER DE PRESTIGE.</p>
                <img loading="lazy" src="/sofa-icon.avif" alt="decor decoration chair design icon" className="marquee-icon" />
              </div>
            </div>
          </div>
        </section>

        {/* FURNITURE CATALOG SELECTION */}
        <section className="product-section pb-zero">
          <div className="w-layout-blockcontainer container w-container">
            <div data-w-id="99b929bf-b300-be48-52eb-c0e6f14df53b" style={{ opacity: 0 }} className="section-title-box center">
              <div className="section-subtitle-box">
                <div className="section-subtitle-icon"></div>
                <p className="section-subtitle">Catalogue Location</p>
              </div>
              <h2 className="section-title">Notre Sélection de Mobilier</h2>
              <p className="section-text">
                Découvrez notre mobilier élégant disponible à la location en Île-de-France.
              </p>
            </div>
            <div className="w-dyn-list">
              <div role="list" className="product-collection-list w-dyn-items">
                
                {/* Item 1 */}
                <div role="listitem" className="w-dyn-item">
                  <Link href="/services" data-w-id="f779cfbe-97e4-5f5e-9b18-0ab043b89f59" style={{ opacity: 0 }} className="product-block w-inline-block">
                    <div className="product-image-box">
                      <div className="product-image-link">
                        <img loading="lazy" style={{ opacity: 1 }} alt="Fauteuil Emmanuelle" src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80" className="product-image" />
                        <img loading="lazy" style={{ opacity: 0 }} alt="Fauteuil Emmanuelle hover" src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80" className="product-image hover-image" />
                      </div>
                    </div>
                    <div className="product-content-box">
                      <h3 style={{ color: 'rgb(0,0,0)' }} className="product-title">Fauteuil Emmanuelle</h3>
                      <p className="product-price">Sur Devis</p>
                    </div>
                  </Link>
                </div>

                {/* Item 2 */}
                <div role="listitem" className="w-dyn-item">
                  <Link href="/services" data-w-id="f779cfbe-97e4-5f5e-9b18-0ab043b89f59" style={{ opacity: 0 }} className="product-block w-inline-block">
                    <div className="product-image-box">
                      <div className="product-image-link">
                        <img loading="lazy" style={{ opacity: 1 }} alt="Chaises Napoleon" src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&q=80" className="product-image" />
                        <img loading="lazy" style={{ opacity: 0 }} alt="Chaises Napoleon hover" src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&q=80" className="product-image hover-image" />
                      </div>
                    </div>
                    <div className="product-content-box">
                      <h3 style={{ color: 'rgb(0,0,0)' }} className="product-title">Chaises Napoléon Dorées</h3>
                      <p className="product-price">Sur Devis</p>
                    </div>
                  </Link>
                </div>

                {/* Item 3 */}
                <div role="listitem" className="w-dyn-item">
                  <Link href="/services" data-w-id="f779cfbe-97e4-5f5e-9b18-0ab043b89f59" style={{ opacity: 0 }} className="product-block w-inline-block">
                    <div className="product-image-box">
                      <div className="product-image-link">
                        <img loading="lazy" style={{ opacity: 1 }} alt="Arche Ronde Metal" src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80" className="product-image" />
                        <img loading="lazy" style={{ opacity: 0 }} alt="Arche Ronde Metal hover" src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80" className="product-image hover-image" />
                      </div>
                    </div>
                    <div className="product-content-box">
                      <h3 style={{ color: 'rgb(0,0,0)' }} className="product-title">Arche Ronde en Métal</h3>
                      <p className="product-price">Sur Devis</p>
                    </div>
                  </Link>
                </div>

                {/* Item 4 */}
                <div role="listitem" className="w-dyn-item">
                  <Link href="/services" data-w-id="f779cfbe-97e4-5f5e-9b18-0ab043b89f59" style={{ opacity: 0 }} className="product-block w-inline-block">
                    <div className="product-image-box">
                      <div className="product-image-link">
                        <img loading="lazy" style={{ opacity: 1 }} alt="Art de la table" src="https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&q=80" className="product-image" />
                        <img loading="lazy" style={{ opacity: 0 }} alt="Art de la table hover" src="https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&q=80" className="product-image hover-image" />
                      </div>
                    </div>
                    <div className="product-content-box">
                      <h3 style={{ color: 'rgb(0,0,0)' }} className="product-title">Art de la table raffiné</h3>
                      <p className="product-price">Sur Devis</p>
                    </div>
                  </Link>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* WHY CHOOSE US / STATS SECTION */}
        <section id="About-Us" className="why-choose-us pb-zero">
          <div className="why-us-outer">
            <div className="bg funfact-bg-two" style={{ opacity: 0.15, backgroundImage: 'url(https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <div className="w-layout-blockcontainer container-small w-container">
              <div className="w-layout-grid why-us-grid">
                
                <div data-w-id="17c3dbdc-2867-bd7a-3b51-96fd4faa3236" style={{ opacity: 0 }} className="why-us-content-box">
                  <div className="section-title-box why-us-title-box">
                    <div className="section-subtitle-box">
                      <div className="section-subtitle-icon"></div>
                      <p className="section-subtitle">Notre Histoire</p>
                    </div>
                    <h2 className="section-title">L'Art de Sublimer Vos Événements</h2>
                    <p className="section-text">OA Événementiel conçoit et coordonne vos plus beaux moments en Île-de-France avec rigueur et passion.</p>
                  </div>
                  <div data-w-id="17c3dbdc-2867-bd7a-3b51-96fd4faa323e" style={{ opacity: 0 }} className="why-us-counter-outer">
                    <div className="counter-block">
                      <h2 className="counter-count">150+</h2>
                      <div className="counter-title-box">
                        <div className="counter-dot"></div>
                        <p className="counter-title">Fêtes Réussies</p>
                      </div>
                    </div>
                    <div className="counter-block">
                      <h2 className="counter-count">120+</h2>
                      <div className="counter-title-box">
                        <div className="counter-dot"></div>
                        <p className="counter-title">Couples Heureux</p>
                      </div>
                    </div>
                    <div className="counter-block">
                      <h2 className="counter-count">5+</h2>
                      <div className="counter-title-box">
                        <div className="counter-dot"></div>
                        <p className="counter-title">Ans d'Expertise</p>
                      </div>
                    </div>
                    <div className="counter-block">
                      <h2 className="counter-count">99%</h2>
                      <div className="counter-title-box">
                        <div className="counter-dot"></div>
                        <p className="counter-title">Satisfaction</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="why-us-image-box">
                  <img
                    style={{ opacity: 0 }}
                    data-w-id="17c3dbdc-2867-bd7a-3b51-96fd4faa3250"
                    alt="Event reception hall details"
                    src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80"
                    loading="lazy"
                    className="why-us-image"
                  />
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS (MARQUEE LAYOUT) */}
        <section id="Testimonial-Section" className="testimonial-section">
          <div className="w-layout-blockcontainer container w-container">
            <div className="sectitle-wrapper">
              <div className="section-title-box mb-zero">
                <div className="section-subtitle-box">
                  <div className="section-subtitle-icon"></div>
                  <p className="section-subtitle">Témoignages</p>
                </div>
                <h2 className="section-title">
                  Ce Que Disent
                  <span className="section-title-br"></span>
                  Nos Clients
                </h2>
              </div>
              <div className="testi-reviews-box">
                <p className="testi-review-text">
                  <span className="testi-review-text-color">120+</span>
                  <span className="br review-br"></span>
                  Avis Clients
                </p>
                <div className="testi-review-thumbs">
                  <img loading="lazy" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" alt="" className="testi-review-thumb first" />
                  <img loading="lazy" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&q=80" alt="" className="testi-review-thumb" />
                  <img loading="lazy" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" alt="" className="testi-review-thumb" />
                  <img loading="lazy" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80" alt="" className="testi-review-thumb" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="marquee-box two">
            <div className="marquee-inner">
              <div className="marquee">
                
                <div className="testimonial-block">
                  <div className="testi-author-box">
                    <img loading="lazy" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" alt="" className="testi-author-image" />
                    <div className="testi-info-box">
                      <p className="testi-author-name">Sophie & Marc</p>
                      <p className="testi-author-designation">Mariage — Versailles</p>
                    </div>
                  </div>
                  <p className="testimonial-text">
                    "Une organisation parfaite, des détails soignés, une équipe à l'écoute. Notre mariage était exactement tel que nous l'avions rêvé."
                  </p>
                  <div className="testi-rating-box">
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                  </div>
                </div>

                <div className="testimonial-block">
                  <div className="testi-author-box">
                    <img loading="lazy" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&q=80" alt="" className="testi-author-image" />
                    <div className="testi-info-box">
                      <p className="testi-author-name">Isabelle M.</p>
                      <p className="testi-author-designation">Anniversaire — Paris</p>
                    </div>
                  </div>
                  <p className="testimonial-text">
                    "L'anniversaire de ma fille a été une féerie. Les décors étaient magnifiques et l'ambiance exactement ce que nous voulions."
                  </p>
                  <div className="testi-rating-box">
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                  </div>
                </div>

                <div className="testimonial-block">
                  <div className="testi-author-box">
                    <img loading="lazy" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" alt="" className="testi-author-image" />
                    <div className="testi-info-box">
                      <p className="testi-author-name">Thomas R.</p>
                      <p className="testi-author-designation">Événement Pro — La Défense</p>
                    </div>
                  </div>
                  <p className="testimonial-text">
                    "Professionnalisme et créativité au rendez-vous. Notre événement d'entreprise a impressionné tous nos partenaires."
                  </p>
                  <div className="testi-rating-box">
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                  </div>
                </div>

                <div className="testimonial-block">
                  <div className="testi-author-box">
                    <img loading="lazy" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80" alt="" className="testi-author-image" />
                    <div className="testi-info-box">
                      <p className="testi-author-name">Camille D.</p>
                      <p className="testi-author-designation">Mariage — Fontainebleau</p>
                    </div>
                  </div>
                  <p className="testimonial-text">
                    "Je recommande vivement ! Le soin apporté à chaque détail et la réactivité de l'équipe ont fait de cet événement un souvenir inoubliable."
                  </p>
                  <div className="testi-rating-box">
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                  </div>
                </div>

              </div>
              <div className="marquee">
                
                <div className="testimonial-block">
                  <div className="testi-author-box">
                    <img loading="lazy" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" alt="" className="testi-author-image" />
                    <div className="testi-info-box">
                      <p className="testi-author-name">Sophie & Marc</p>
                      <p className="testi-author-designation">Mariage — Versailles</p>
                    </div>
                  </div>
                  <p className="testimonial-text">
                    "Une organisation parfaite, des détails soignés, une équipe à l'écoute. Notre mariage était exactement tel que nous l'avions rêvé."
                  </p>
                  <div className="testi-rating-box">
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                  </div>
                </div>

                <div className="testimonial-block">
                  <div className="testi-author-box">
                    <img loading="lazy" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&q=80" alt="" className="testi-author-image" />
                    <div className="testi-info-box">
                      <p className="testi-author-name">Isabelle M.</p>
                      <p className="testi-author-designation">Anniversaire — Paris</p>
                    </div>
                  </div>
                  <p className="testimonial-text">
                    "L'anniversaire de ma fille a été une féerie. Les décors étaient magnifiques et l'ambiance exactement ce que nous voulions."
                  </p>
                  <div className="testi-rating-box">
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                  </div>
                </div>

                <div className="testimonial-block">
                  <div className="testi-author-box">
                    <img loading="lazy" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" alt="" className="testi-author-image" />
                    <div className="testi-info-box">
                      <p className="testi-author-name">Thomas R.</p>
                      <p className="testi-author-designation">Événement Pro — La Défense</p>
                    </div>
                  </div>
                  <p className="testimonial-text">
                    "Professionnalisme et créativité au rendez-vous. Notre événement d'entreprise a impressionné tous nos partenaires."
                  </p>
                  <div className="testi-rating-box">
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                  </div>
                </div>

                <div className="testimonial-block">
                  <div className="testi-author-box">
                    <img loading="lazy" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80" alt="" className="testi-author-image" />
                    <div className="testi-info-box">
                      <p className="testi-author-name">Camille D.</p>
                      <p className="testi-author-designation">Mariage — Fontainebleau</p>
                    </div>
                  </div>
                  <p className="testimonial-text">
                    "Je recommande vivement ! Le soin apporté à chaque détail et la réactivité de l'équipe ont fait de cet événement un souvenir inoubliable."
                  </p>
                  <div className="testi-rating-box">
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                    <img loading="lazy" src="/star.svg" alt="" />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* NEWS SECTION */}
        <section id="News-Section" className="news-section">
          <div className="news-outer-box">
            <div className="w-layout-blockcontainer container-small w-container">
              <div data-w-id="725716f8-4a75-331d-11d5-f6a5ae38c30d" style={{ opacity: 0 }} className="section-title-box center">
                <div className="section-subtitle-box">
                  <div className="section-subtitle-icon"></div>
                  <p className="section-subtitle">Scénographies & Inspirations</p>
                </div>
                <h2 className="section-title">Actualités & Tendances Déco</h2>
                <p className="section-text">Retrouvez nos articles pour vous guider dans la planification de votre jour J.</p>
              </div>
              <div data-w-id="60c74287-f977-1d9e-03a4-f17a4c98469e" style={{ opacity: 0 }} className="w-layout-grid news-grid">
                <div className="w-dyn-list">
                  <div role="list" className="w-dyn-items">
                    <div role="listitem" className="w-dyn-item">
                      <Link data-w-id="894310b8-a38f-418f-2559-1af75c993d50" style={{ opacity: 0 }} href="/services" className="news-block two w-inline-block">
                        <div className="news-image-box-two">
                          <img loading="lazy" src="https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80" alt="" className="news-image two" />
                        </div>
                        <div className="news-content two">
                          <div className="news-date-box">
                            <p className="news-date">10 Juillet 2026</p>
                            <p className="news-date-divider">-</p>
                            <p className="news-author">Par OA Events</p>
                          </div>
                          <h3 className="news-title">Les grandes tendances de décoration de table pour cette saison</h3>
                          <p className="news-text">Un guide complet pour harmoniser vos centres de table, vaisselle et fleurs pour votre jour J.</p>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="w-dyn-list">
                  <div role="list" className="collection-list-four w-dyn-items">
                    
                    <div role="listitem" className="w-dyn-item">
                      <Link data-w-id="c3f0c6fe-b926-b4a0-df6c-c9f45cc42d75" style={{ opacity: 0 }} href="/services" className="news-block w-inline-block">
                        <div className="news-image-box">
                          <img loading="lazy" alt="" src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80" className="news-image" />
                        </div>
                        <div className="news-content two">
                          <div className="news-date-box">
                            <p className="news-date">08 Juillet 2026</p>
                            <p className="news-date-divider">-</p>
                            <p className="news-author">Par OA Events</p>
                          </div>
                          <h4 className="news-title">Comment choisir son thème de mariage sans fausse note ?</h4>
                        </div>
                      </Link>
                    </div>

                    <div role="listitem" className="w-dyn-item">
                      <Link data-w-id="c3f0c6fe-b926-b4a0-df6c-c9f45cc42d75" style={{ opacity: 0 }} href="/services" className="news-block w-inline-block">
                        <div className="news-image-box">
                          <img loading="lazy" alt="" src="https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80" className="news-image" />
                        </div>
                        <div className="news-content two">
                          <div className="news-date-box">
                            <p className="news-date">05 Juillet 2026</p>
                            <p className="news-date-divider">-</p>
                            <p className="news-author">Par OA Events</p>
                          </div>
                          <h4 className="news-title">5 astuces pour réussir votre événement d'entreprise</h4>
                        </div>
                      </Link>
                    </div>

                    <div role="listitem" className="w-dyn-item">
                      <Link data-w-id="c3f0c6fe-b926-b4a0-df6c-c9f45cc42d75" style={{ opacity: 0 }} href="/services" className="news-block w-inline-block">
                        <div className="news-image-box">
                          <img loading="lazy" alt="" src="https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80" className="news-image" />
                        </div>
                        <div className="news-content two">
                          <div className="news-date-box">
                            <p className="news-date">01 Juillet 2026</p>
                            <p className="news-date-divider">-</p>
                            <p className="news-author">Par OA Events</p>
                          </div>
                          <h4 className="news-title">Pourquoi louer sa décoration de réception plutôt que l'acheter ?</h4>
                        </div>
                      </Link>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SUBSCRIBE SECTION */}
        <section className="subscribe-section">
          <div className="w-layout-blockcontainer container-small w-container">
            <div data-w-id="b9483a6f-7a6d-8b3e-7c58-239e4ba089e6" style={{ opacity: 0 }} className="subscribe-outer">
              <div className="subscribe-block">
                <div className="section-title-box subscribe-title-box">
                  <h2 className="section-title light">Suivez Nos Inspirations</h2>
                  <p className="section-text light">Inscrivez-vous à notre newsletter pour recevoir nos conseils d'organisation et actualités déco.</p>
                </div>
                <div className="form-block w-form">
                  <form id="email-form" name="email-form" data-name="Email Form" method="get" className="subscribe-form" data-wf-page-id="686b79afb668ce59a9047b99" data-wf-element-id="b9483a6f-7a6d-8b3e-7c58-239e4ba089ee" data-turnstile-sitekey="0x4AAAAAAAQTptj2So4dx43e">
                    <input className="subscribe-input w-input" maxLength="256" name="name" data-name="Name" placeholder="Votre adresse email..." type="text" id="name" required="" />
                    <input type="submit" data-wait="Veuillez patienter..." className="subscribe-btn w-button" value="S'inscrire" />
                  </form>
                  <div className="w-form-done">
                    <div>Merci ! Votre inscription a été reçue !</div>
                  </div>
                  <div className="w-form-fail">
                    <div>Oups ! Une erreur est survenue lors de l'envoi du formulaire.</div>
                  </div>
                </div>
              </div>
              <div className="subscribe-image-box">
                <img loading="lazy" src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80" alt="" className="subscribe-image" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

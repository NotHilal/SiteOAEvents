import { useEffect, useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import Lightbox from 'yet-another-react-lightbox'
import AOS from 'aos'
import Loader from '../src/components/Loader.jsx'
import Navbar from '../src/components/Navbar.jsx'
import Footer from '../src/components/Footer.jsx'

const PHOTOS = [
  { src: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80', cat: 'mariage', label: 'Mariage' },
  { src: 'https://images.unsplash.com/photo-1520854221256-17d7dc783f06?w=800&q=80', cat: 'mariage', label: 'Mariage' },
  { src: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80', cat: 'mariage', label: 'Mariage' },
  { src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80', cat: 'anniversaire', label: 'Anniversaire' },
  { src: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80', cat: 'anniversaire', label: 'Anniversaire' },
  { src: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80', cat: 'anniversaire', label: 'Anniversaire' },
  { src: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80', cat: 'pro', label: 'Événement Pro' },
  { src: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80', cat: 'pro', label: 'Événement Pro' },
  { src: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80', cat: 'pro', label: 'Événement Pro' },
  { src: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80', cat: 'deco', label: 'Location Déco' },
  { src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', cat: 'deco', label: 'Location Déco' },
  { src: 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=800&q=80', cat: 'deco', label: 'Location Déco' },
]

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'mariage', label: 'Mariages' },
  { key: 'anniversaire', label: 'Anniversaires' },
  { key: 'pro', label: 'Événements Pro' },
  { key: 'deco', label: 'Location Déco' },
]

export default function Galerie() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useEffect(() => {
    AOS.init({ duration: 820, easing: 'ease-in-out', once: true, offset: 55 })
    AOS.refresh()
  }, [])

  const filtered = activeFilter === 'all' ? PHOTOS : PHOTOS.filter(p => p.cat === activeFilter)
  const lightboxSlides = filtered.map(p => ({ src: p.src }))

  const openLightbox = (idx) => {
    setLightboxIndex(idx)
    setLightboxOpen(true)
  }

  return (
    <>
      <Head>
        <title>Galerie — OA Événementiel</title>
        <meta name="description" content="Découvrez les photos de nos réalisations d'événements et de décoration de tables pour mariages, anniversaires et événements d'entreprise." />
      </Head>

      <div className="site-wrap">
        <Loader />
        <Navbar />

        <div
          className="page-header"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1920&q=80)' }}
        >
          <div className="page-header-overlay" />
          <div className="container">
            <h1>Notre Galerie</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb justify-content-center">
                <li className="breadcrumb-item"><Link href="/">Accueil</Link></li>
                <li className="breadcrumb-item active">Galerie</li>
              </ol>
            </nav>
          </div>
        </div>

        <section className="gallery-page-section">
          <div className="container">
            <div className="gallery-filter">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  className={activeFilter === f.key ? 'active' : ''}
                  onClick={() => setActiveFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="row gallery-full-grid">
              {filtered.map((photo, i) => (
                <div key={photo.src} className="col-md-4 gallery-full-item" data-aos="fade-up" data-aos-delay={(i % 3) * 80}>
                  <button
                    className="gallery-link w-100 border-0 p-0"
                    onClick={() => openLightbox(i)}
                  >
                    <img src={photo.src} alt={photo.label} />
                    <div className="gallery-overlay">
                      <i className="fas fa-search-plus" />
                      <span>{photo.label}</span>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={lightboxSlides}
        />

        <Footer />
      </div>
    </>
  )
}

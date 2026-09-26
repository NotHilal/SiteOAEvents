import { useEffect, useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import Lightbox from 'yet-another-react-lightbox'
import GalleryCarousel from '../src/components/GalleryCarousel.jsx'
import AOS from 'aos'
import { supabase } from '../src/lib/supabase.js'
import { GALERIE_CATEGORIES, DEFAULT_GALERIE_PHOTOS } from '../src/lib/galerie-defaults.js'

const PAGE_HEADER_DEFAULT = '/PHOTO-2026-09-26-16-24-43.jpg'

const FILTERS = [{ key: 'all', label: 'Tous' }, ...GALERIE_CATEGORIES]
// Photos shown before the "Afficher toutes les photos" button.
const INITIAL_COUNT = 12

export default function Galerie() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [pageHeader, setPageHeader] = useState(null)
  const [photos, setPhotos] = useState(DEFAULT_GALERIE_PHOTOS)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    AOS.init({ duration: 820, easing: 'ease-in-out', once: true, offset: 55 })
    AOS.refresh()
  }, [])

  useEffect(() => {
    supabase.from('site_content').select('*').eq('key', 'images_galerie').then(({ data }) => {
      const row = data && data[0]
      if (!row) return
      try {
        const parsed = JSON.parse(row.value)
        setPageHeader(parsed.page_header || null)
        if (Array.isArray(parsed.photos) && parsed.photos.length) setPhotos(parsed.photos)
      } catch {}
    })
  }, [])

  const filtered = activeFilter === 'all' ? photos : photos.filter(p => p.cat === activeFilter)
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_COUNT)
  // The lightbox browses the whole filtered set, not just the visible part.
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
        <div
          className="page-header"
          style={{ backgroundImage: `url(${pageHeader || PAGE_HEADER_DEFAULT})` }}
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
                  onClick={() => { setActiveFilter(f.key); setShowAll(false) }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <GalleryCarousel key={activeFilter} photos={filtered} onOpen={openLightbox} />

            <div className="row gallery-full-grid">
              {visible.map((photo, i) => (
                <div key={photo.id} className="col-md-4 gallery-full-item" data-aos="fade-up" data-aos-delay={(i % 3) * 80}>
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

            {filtered.length > INITIAL_COUNT && (
              <div className="gallery-more">
                <button type="button" className="btn btn-rose-gold" onClick={() => setShowAll(v => !v)}>
                  {showAll
                    ? <><i className="fas fa-chevron-up me-2" />Afficher moins</>
                    : <><i className="fas fa-images me-2" />Afficher toutes les photos ({filtered.length})</>
                  }
                </button>
              </div>
            )}
          </div>
        </section>

        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={lightboxSlides}
        />
      </div>
    </>
  )
}

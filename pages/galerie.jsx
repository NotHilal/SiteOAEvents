import { useEffect, useState } from 'react'
import Link from 'next/link'
import Seo from '../src/components/Seo.jsx'
import Lightbox from 'yet-another-react-lightbox'
import { supabase } from '../src/lib/supabase.js'

const PAGE_HEADER_DEFAULT = 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1600&q=75&auto=format&fit=crop'

// Used only as a fallback for a brand-new DB whose images_galerie row hasn't
// been migrated to the { page_header, photos: [...] } shape yet (see
// src/lib/sqlite-db.js seed) — the real, editable list lives in the DB from
// then on (Espace OA > Visuel Site > Galerie), not here.
const DEFAULT_PHOTOS = [
  { id: 'photo_1', src: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=75&auto=format&fit=crop', cat: 'mariage', label: 'Mariage' },
  { id: 'photo_2', src: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=75&auto=format&fit=crop', cat: 'mariage', label: 'Mariage' },
  { id: 'photo_3', src: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=75&auto=format&fit=crop', cat: 'mariage', label: 'Mariage' },
  { id: 'photo_4', src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=75&auto=format&fit=crop', cat: 'anniversaire', label: 'Anniversaire' },
  { id: 'photo_5', src: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=75&auto=format&fit=crop', cat: 'anniversaire', label: 'Anniversaire' },
  { id: 'photo_6', src: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=75&auto=format&fit=crop', cat: 'anniversaire', label: 'Anniversaire' },
  { id: 'photo_7', src: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=75&auto=format&fit=crop', cat: 'pro', label: 'Événement Pro' },
  { id: 'photo_8', src: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=75&auto=format&fit=crop', cat: 'pro', label: 'Événement Pro' },
  { id: 'photo_9', src: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=75&auto=format&fit=crop', cat: 'pro', label: 'Événement Pro' },
  { id: 'photo_10', src: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=75&auto=format&fit=crop', cat: 'deco', label: 'Location Déco' },
  { id: 'photo_11', src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=75&auto=format&fit=crop', cat: 'deco', label: 'Location Déco' },
  { id: 'photo_12', src: 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=800&q=75&auto=format&fit=crop', cat: 'deco', label: 'Location Déco' },
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
  const [pageHeader, setPageHeader] = useState(null)
  const [photos, setPhotos] = useState(DEFAULT_PHOTOS)


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
  const lightboxSlides = filtered.map(p => ({ src: p.src }))

  const openLightbox = (idx) => {
    setLightboxIndex(idx)
    setLightboxOpen(true)
  }

  return (
    <>
      <Seo
        title="Galerie de nos réalisations"
        description="Découvrez en images nos réalisations : décoration de tables, mariages, anniversaires et événements d'entreprise en Île-de-France."
        path="/galerie"
        breadcrumb={[{ name: 'Galerie', path: '/galerie' }]}
        preloadImage={PAGE_HEADER_DEFAULT}
      />

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
                  onClick={() => setActiveFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="row gallery-full-grid">
              {filtered.map((photo, i) => (
                <div key={photo.id} className="col-md-4 gallery-full-item" data-reveal>
                  <button
                    className="gallery-link w-100 border-0 p-0"
                    onClick={() => openLightbox(i)}
                  >
                    <img src={photo.src} alt={photo.label} loading="lazy" decoding="async" />
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
      </div>
    </>
  )
}

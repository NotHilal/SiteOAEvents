import { useEffect, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import Icon from '../Icon.jsx'

// Product photos: a large picture with arrows, a strip of thumbnails, and a
// full-screen viewer (zoom with wheel / pinch / double-click, swipe or
// arrows between photos, thumbnails at the bottom) on click.
export default function ProductGallery({ images, alt, compact = false }) {
  const list = images.filter(Boolean)
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  // A new set of photos (another option chosen) starts on its first one.
  const key = list.join('|')
  useEffect(() => { setIndex(0) }, [key])

  if (!list.length) {
    return (
      <div className={`shop-gallery${compact ? ' is-compact' : ''}`}>
        <div className="shop-gallery-main shop-gallery-empty">
          <Icon name="image" size={56} strokeWidth={0.9} />
          <span>Photo bientôt disponible</span>
        </div>
      </div>
    )
  }

  const current = Math.min(index, list.length - 1)
  const go = delta => setIndex(i => (i + delta + list.length) % list.length)

  return (
    <div className={`shop-gallery${compact ? ' is-compact' : ''}`}>
      <div className="shop-gallery-main">
        <button type="button" className="shop-gallery-zoom" onClick={() => setOpen(true)} aria-label={`Agrandir la photo ${current + 1} sur ${list.length}`}>
          <img key={list[current]} src={list[current]} alt={alt} />
          <span className="shop-gallery-zoom-hint" aria-hidden="true"><i className="fas fa-search-plus" /> Agrandir</span>
        </button>
        {list.length > 1 && (
          <>
            <button type="button" className="shop-gallery-arrow is-prev" onClick={() => go(-1)} aria-label="Photo précédente"><i className="fas fa-chevron-left" /></button>
            <button type="button" className="shop-gallery-arrow is-next" onClick={() => go(1)} aria-label="Photo suivante"><i className="fas fa-chevron-right" /></button>
            <span className="shop-gallery-count" aria-hidden="true">{current + 1} / {list.length}</span>
          </>
        )}
      </div>
      {list.length > 1 && (
        <ol className="shop-gallery-thumbs" aria-label="Photos">
          {list.map((src, i) => (
            <li key={src}>
              <button type="button" className={`shop-gallery-thumb${i === current ? ' is-active' : ''}`} onClick={() => setIndex(i)} aria-label={`Photo ${i + 1}`} aria-current={i === current || undefined}>
                <img src={src} alt="" loading="lazy" decoding="async" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={current}
        on={{ view: ({ index: i }) => setIndex(i) }}
        slides={list.map(src => ({ src, alt }))}
        plugins={[Zoom, Thumbnails, Counter]}
        zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true, doubleClickMaxStops: 3 }}
        thumbnails={{ width: 84, height: 64, border: 0, borderRadius: 0, padding: 0, gap: 8, imageFit: 'cover' }}
        carousel={{ finite: list.length < 3 }}
        controller={{ closeOnBackdropClick: true }}
        render={list.length < 2 ? { buttonPrev: () => null, buttonNext: () => null } : undefined}
        labels={{ Previous: 'Précédente', Next: 'Suivante', Close: 'Fermer', 'Zoom in': 'Zoomer', 'Zoom out': 'Dézoomer', Lightbox: 'Visionneuse', Carousel: 'Photos', Slide: 'Photo', Thumbnails: 'Miniatures' }}
        styles={{ container: { backgroundColor: 'rgba(12, 11, 9, .94)' } }}
      />
    </div>
  )
}

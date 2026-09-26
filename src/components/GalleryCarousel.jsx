import { useEffect, useRef, useState } from 'react'

// Coverflow-style carousel for /galerie: the current photo sits sharp in the
// middle, the previous/next ones peek out on each side, smaller and blurred.
// Only the photos within 2 steps of the current one are rendered — each is
// keyed by its index, so moving just changes their offset and the CSS
// transition slides them into place. Remount it (key) to reset to the
// first photo, e.g. when the gallery filter changes.

const AUTOPLAY_MS = 5000
const SWIPE_PX = 40

export default function GalleryCarousel({ photos, onOpen }) {
  const n = photos.length
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const pointerStart = useRef(null)

  useEffect(() => {
    if (paused || n < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setCurrent(c => (c + 1) % n), AUTOPLAY_MS)
    return () => clearInterval(t)
  }, [paused, n])

  if (!n) return null

  const go = (step) => setCurrent(c => (c + step + n) % n)
  // The list can shrink (admin edit loaded after mount) — stay in range.
  const cur = current % n

  // With few photos, show fewer neighbours so none appears twice.
  const reach = Math.min(2, Math.floor((n - 1) / 2))
  const slides = []
  for (let offset = -reach; offset <= reach; offset++) {
    slides.push({ offset, index: (cur + offset + n) % n })
  }
  // An even count leaves one photo on the far side — show it on the right.
  if (n > 1 && n <= 4 && n % 2 === 0) slides.push({ offset: reach + 1, index: (cur + reach + 1) % n })

  return (
    <div
      className="oa-coverflow"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft') go(-1)
        if (e.key === 'ArrowRight') go(1)
      }}
      tabIndex={0}
      role="region"
      aria-roledescription="carrousel"
      aria-label="Photos de nos réalisations"
    >
      <div
        className="oa-coverflow-stage"
        onPointerDown={e => { pointerStart.current = e.clientX }}
        onPointerUp={e => {
          if (pointerStart.current == null) return
          const dx = e.clientX - pointerStart.current
          pointerStart.current = null
          if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1)
        }}
      >
        {slides.map(({ offset, index }) => {
          const photo = photos[index]
          return (
            <button
              key={photo.id || photo.src}
              type="button"
              className={`oa-coverflow-slide oa-coverflow-pos${offset < 0 ? 'm' : 'p'}${Math.abs(offset)}`}
              onClick={() => (offset === 0 ? onOpen(index) : go(offset))}
              aria-label={offset === 0 ? `Agrandir la photo ${index + 1}` : `Photo ${offset < 0 ? 'précédente' : 'suivante'}`}
              tabIndex={offset === 0 ? 0 : -1}
            >
              <img src={photo.src} alt={photo.label || ''} draggable={false} />
              {offset === 0 && photo.label && <span className="oa-coverflow-label">{photo.label}</span>}
            </button>
          )
        })}
      </div>

      {n > 1 && (
        <div className="oa-coverflow-controls">
          <button type="button" className="oa-carousel-arrow" onClick={() => go(-1)} aria-label="Photo précédente">
            <i className="fas fa-chevron-left" />
          </button>
          <span className="oa-coverflow-count">{cur + 1} / {n}</span>
          <button type="button" className="oa-carousel-arrow" onClick={() => go(1)} aria-label="Photo suivante">
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef } from 'react'

// Background video for the homepage hero. Playback starts from JS rather
// than the autoPlay attribute so visitors with prefers-reduced-motion or a
// slow connection never download the clip: they keep the poster frame. The clip also pauses while
// the hero is scrolled out of view.
export default function HeroVideo() {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Data savers and slow connections keep the poster: the clip weighs 4–6 MB.
    const connection = navigator.connection
    if (connection?.saveData || /(^|-)[23]g$/.test(connection?.effectiveType || '')) return

    const play = () => video.play().catch(() => {})
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) play()
      else video.pause()
    }, { threshold: 0.15 })
    // Starts once the page has finished loading so the download never competes
    // with the poster, the page's largest paint.
    const start = () => observer.observe(video)
    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })
    return () => {
      window.removeEventListener('load', start)
      observer.disconnect()
    }
  }, [])

  return (
    <>
      <video
        ref={videoRef}
        className="oa-hero-video"
        poster="/videos/oa-hero-poster.jpg"
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
      >
        <source src="/videos/oa-hero-540.mp4" type="video/mp4" media="(max-width: 767px)" />
        <source src="/videos/oa-hero-720.mp4" type="video/mp4" />
      </video>
      <div className="oa-hero-scrim" aria-hidden="true" />
    </>
  )
}

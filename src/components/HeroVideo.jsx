import { useEffect, useRef } from 'react'

// Background video for the homepage hero. Playback starts from JS rather
// than the autoPlay attribute so visitors with prefers-reduced-motion never
// download the clip: they keep the poster frame. The clip also pauses while
// the hero is scrolled out of view.
export default function HeroVideo() {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const play = () => video.play().catch(() => {})
    play()

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) play()
      else video.pause()
    }, { threshold: 0.15 })
    observer.observe(video)
    return () => observer.disconnect()
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

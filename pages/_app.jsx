import '../src/index.css'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Lenis from 'lenis'
import Loader from '../src/components/Loader.jsx'
import Navbar from '../src/components/Navbar.jsx'
import Footer from '../src/components/Footer.jsx'
import ContactWidget from '../src/components/ContactWidget.jsx'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  // Espace OA is a standalone admin dashboard with its own layout/login gate —
  // it doesn't use the public site's Navbar/Footer.
  const isAdmin = router.pathname === '/espace-oa'

  // 'idle' | 'loading' | 'done' — drives the top progress bar. 'loading'
  // creeps the bar toward 80% (client navigations are near-instant, so this
  // rarely finishes), 'done' snaps it to 100% then fades it out.
  const [navState, setNavState] = useState('idle')
  const doneTimer = useRef(null)
  const lenisRef = useRef(null)

  // Smooth, eased scrolling on the public site — plain mouse-wheel input has
  // no momentum by default (each tick moves a fixed amount and stops dead),
  // which read as abrupt. Skipped on /espace-oa: the admin dashboard has
  // several of its own internal scroll containers (tables, modals, the
  // calendar grid) that a global wheel-hijacking library would fight with.
  useEffect(() => {
    if (isAdmin) return
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true })
    lenisRef.current = lenis
    window.__lenis = lenis
    let rafId
    function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      lenisRef.current = null
      window.__lenis = null
    }
  }, [isAdmin])

  useEffect(() => {
    const start = () => {
      clearTimeout(doneTimer.current)
      setNavState('loading')
    }
    const finish = () => {
      // Reset scroll here (not on start) so it happens right as the new
      // page's content mounts, in step with the progress bar completing.
      // Goes through Lenis (when active) rather than window.scrollTo
      // directly, so Lenis's internal position stays in sync — otherwise
      // the next smooth-scrolled wheel tick would jump back to wherever
      // Lenis still thought the page was.
      if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true })
      else window.scrollTo(0, 0)
      setNavState('done')
      doneTimer.current = setTimeout(() => setNavState('idle'), 260)
    }
    router.events.on('routeChangeStart', start)
    router.events.on('routeChangeComplete', finish)
    router.events.on('routeChangeError', finish)
    return () => {
      router.events.off('routeChangeStart', start)
      router.events.off('routeChangeComplete', finish)
      router.events.off('routeChangeError', finish)
      clearTimeout(doneTimer.current)
    }
  }, [router.events])

  return (
    <>
      <div className={`oa-progress-bar oa-progress-${navState}`} aria-hidden="true" />
      <div className="marble-layer" aria-hidden="true" />
      {/* Mounted once here (not per-page) so its intro animation plays only
          on true first load, not on every client-side route change. */}
      {!isAdmin && <Loader />}
      {!isAdmin && <Navbar />}
      {/* key={asPath} forces a remount on navigation, which restarts the
          .oa-page-transition CSS animation for every new page. The animation
          animates `transform`, and CSS animations keep their end-state
          computed value (an identity matrix, not the literal keyword `none`)
          applied for as long as fill-mode holds it — and ANY non-`none`
          transform on an ancestor, identity or not, turns it into the
          positioning containing block for descendant `position: fixed`
          elements instead of the viewport. That silently broke fixed-position
          overlays rendered inside page content (e.g. a modal). Once the
          animation finishes, drop the `animation` property entirely (via
          this class, added directly to the DOM node, no re-render) so
          `transform` falls back to its real default of `none` and fixed
          descendants target the viewport again. e.target check excludes
          animations bubbling up from descendants (AOS, etc). */}
      <div
        key={router.asPath}
        className="oa-page-transition"
        onAnimationEnd={e => { if (e.target === e.currentTarget) e.currentTarget.classList.add('oa-anim-done') }}
      >
        <Component {...pageProps} />
      </div>
      {!isAdmin && <Footer />}
      {!isAdmin && <ContactWidget />}
    </>
  )
}

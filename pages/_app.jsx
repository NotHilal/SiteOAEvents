// Self-hosted (was loaded from Google Fonts / cdnjs / jsDelivr in
// _document): no render-blocking third-party requests, and visitors' IPs
// are no longer sent to those CDNs. Same versions as the CDN links had.
// Bootstrap first so the site's own CSS still overrides it.
import 'bootstrap/dist/css/bootstrap.min.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import '@fontsource/lato/300.css'
import '@fontsource/lato/400.css'
import '@fontsource/lato/400-italic.css'
import '@fontsource/lato/700.css'
import '@fontsource/lato/900.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'
import '../src/index.css'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Lenis from 'lenis'
import Loader from '../src/components/Loader.jsx'
import Navbar from '../src/components/Navbar.jsx'
import Footer from '../src/components/Footer.jsx'
import CookieConsent from '../src/components/CookieConsent.jsx'
import useScrollReveal from '../src/lib/useScrollReveal.js'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  // Espace OA is a standalone admin dashboard with its own layout/login gate —
  // it doesn't use the public site's Navbar/Footer.
  // /example and /example/* are design-reference pages (a saved third-party site in an
  // iframe) and get the same bare layout.
  const isAdmin = router.pathname === '/espace-oa' || router.pathname.startsWith('/example')
  // asPath without its #hash: jumping to an anchor on the same page
  // (e.g. the header's /contact#localisation) mustn't remount the page.
  const pagePath = router.asPath.split('#')[0]

  // 'idle' | 'loading' | 'done' — drives the top progress bar. 'loading'
  // creeps the bar toward 80% (client navigations are near-instant, so this
  // rarely finishes), 'done' snaps it to 100% then fades it out.
  const [navState, setNavState] = useState('idle')
  const doneTimer = useRef(null)
  const lenisRef = useRef(null)
  const pageRef = useRef(null)
  // Fade-up-on-scroll for page content (not the navbar/footer, which live
  // outside this wrapper). Re-runs for each page, since the wrapper below
  // remounts on every navigation.
  useScrollReveal(pageRef, isAdmin ? null : pagePath)

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

  // A URL with a #hash lands on that element, just below the sticky header.
  // Called once right away, then again (smoothly) when the page's fade-in
  // ends: that animation starts the content 28px lower and scaled down, so
  // the first landing spot is slightly off. Links to an anchor on another
  // page pass scroll={false} so Next's own hash scroll doesn't fight this.
  const scrollToHash = ({ immediate }) => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    const target = id && document.getElementById(id)
    if (!target) return false
    const offset = -((document.querySelector('.oah')?.offsetHeight || 0) + 16)
    if (lenisRef.current) lenisRef.current.scrollTo(target, immediate ? { immediate: true, offset } : { offset, duration: 0.5 })
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: immediate ? 'instant' : 'smooth' })
    return true
  }

  useEffect(() => {
    const start = () => {
      clearTimeout(doneTimer.current)
      setNavState('loading')
    }
    const scrollToHashOrTop = () => {
      if (!scrollToHash({ immediate: true })) {
        if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true })
        else window.scrollTo(0, 0)
      }
    }
    const finish = () => {
      // Reset scroll (or jump to the URL's #anchor) here, not on start, so
      // it happens right as the new page's content mounts, in step with the
      // progress bar completing. Goes through Lenis (when active) rather than window.scrollTo
      // directly, so Lenis's internal position stays in sync — otherwise
      // the next smooth-scrolled wheel tick would jump back to wherever
      // Lenis still thought the page was.
      scrollToHashOrTop()
      setNavState('done')
      doneTimer.current = setTimeout(() => setNavState('idle'), 260)
    }
    router.events.on('routeChangeStart', start)
    router.events.on('routeChangeComplete', finish)
    router.events.on('routeChangeError', finish)
    router.events.on('hashChangeComplete', scrollToHashOrTop)
    return () => {
      router.events.off('hashChangeComplete', scrollToHashOrTop)
      router.events.off('routeChangeStart', start)
      router.events.off('routeChangeComplete', finish)
      router.events.off('routeChangeError', finish)
      clearTimeout(doneTimer.current)
    }
  }, [router.events])

  return (
    <>
      <div className={`oa-progress-bar oa-progress-${navState}`} aria-hidden="true" />
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
          animations bubbling up from descendants (scroll reveal, etc). */}
      <div
        key={pagePath}
        ref={pageRef}
        className="oa-page-transition"
        onAnimationEnd={e => {
          if (e.target !== e.currentTarget) return
          e.currentTarget.classList.add('oa-anim-done')
          scrollToHash({ immediate: false })
        }}
      >
        <Component {...pageProps} />
      </div>
      {!isAdmin && <Footer />}
      {!isAdmin && <CookieConsent />}
    </>
  )
}

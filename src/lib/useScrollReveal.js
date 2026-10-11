import { useEffect } from 'react'

// Scroll reveal: content blocks fade in while rising from below as they
// enter the viewport — once per page view, never replayed on scroll-up.
// Replaces AOS (heavier, sideways slides, and it hid content until its own
// script ran).
//
// Targets inside `root` (in priority order):
//   1. [data-reveal] elements — or, when the element is a grid
//      ([data-reveal-stagger] or a class ending in "-grid"), its children,
//      so cards rise one after another instead of the grid as one slab.
//   2. [data-reveal-group] containers (e.g. a carousel track): observed as
//      one block, but on entry their children rise one after another —
//      children scrolled off to the side just appear, no stagger wasted.
//   3. Any other "-grid" container's children.
//   4. Fallback: each <section> that contains none of the above.
// Never targets anything nested inside another target, fixed/sticky
// elements, or dialogs/popovers.
//
// Fail-safe: content is only hidden once html.reveal-on is set (here), so
// without JS, without IntersectionObserver, or with reduced motion,
// everything simply renders visible.

const STAGGER_MS = 70
const MAX_STAGGER_STEPS = 5
const GRID_CLASS = /(^|\s)[\w-]*-grid(\s|$)/

function isGrid(el) {
  return el.hasAttribute('data-reveal-stagger') || GRID_CLASS.test(el.className || '')
}

function isExcluded(el) {
  if (el.closest('[role="dialog"], [aria-modal="true"], .modal, [popover]')) return true
  const pos = getComputedStyle(el).position
  return pos === 'fixed' || pos === 'sticky'
}

function collectTargets(root) {
  const found = new Set()
  root.querySelectorAll('[data-reveal]').forEach(el => {
    if (isGrid(el)) Array.from(el.children).forEach(c => found.add(c))
    else found.add(el)
  })
  root.querySelectorAll('[data-reveal-group]').forEach(el => found.add(el))
  root.querySelectorAll('[class*="-grid"], [data-reveal-stagger]').forEach(grid => {
    if (isGrid(grid)) Array.from(grid.children).forEach(c => found.add(c))
  })
  root.querySelectorAll('section').forEach(section => {
    const hasInner = Array.from(found).some(t => section.contains(t))
    if (!hasInner) found.add(section)
  })
  // Drop anything nested inside another target — one animation per area.
  const list = Array.from(found)
  return list.filter(el => !list.some(other => other !== el && other.contains(el)) && !isExcluded(el))
}

export default function useScrollReveal(rootRef, key) {
  useEffect(() => {
    const root = rootRef.current
    if (key == null || !root || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    document.documentElement.classList.add('reveal-on')
    const handled = new WeakSet()
    // A group's own box can sit off-screen (a carousel track shifted by
    // translateX) while its overflowing children are visible, so groups are
    // observed through their parent — the visible window — instead.
    const groupFor = new WeakMap()

    const show = (el, delay) => {
      el.style.transitionDelay = delay ? `${delay}ms` : ''
      el.setAttribute('data-reveal-state', 'shown')
      // Hand the element back its own transitions/transforms once done.
      const done = e => {
        if (e && e.target !== el) return
        el.removeEventListener('transitionend', done)
        el.removeAttribute('data-reveal-state')
        el.style.transitionDelay = ''
      }
      el.addEventListener('transitionend', done)
      setTimeout(done, 1400 + delay)
    }

    const io = new IntersectionObserver(entries => {
      const entering = entries
        .filter(e => e.isIntersecting)
        .map(e => groupFor.get(e.target) || e.target)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      let step = 0
      entering.forEach(el => {
        io.unobserve(el.hasAttribute('data-reveal-group') ? el.parentElement : el)
        if (!el.hasAttribute('data-reveal-group')) {
          show(el, Math.min(step++, MAX_STAGGER_STEPS) * STAGGER_MS)
          return
        }
        Array.from(el.children).forEach(child => {
          const r = child.getBoundingClientRect()
          const onScreen = r.right > 0 && r.left < window.innerWidth
          show(child, onScreen ? Math.min(step++, MAX_STAGGER_STEPS) * STAGGER_MS : 0)
        })
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 })

    // initial=true: blocks already on screen at load stay put (no flash);
    // later scans (content loaded async) animate whatever is new.
    const scan = initial => {
      const vh = window.innerHeight
      collectTargets(root).forEach(el => {
        if (handled.has(el)) return
        // Skip new content landing inside an area that already revealed.
        if (!initial && el.parentElement?.closest('[data-reveal-done]')) return
        handled.add(el)
        el.setAttribute('data-reveal-done', '')
        const r = el.getBoundingClientRect()
        if (initial && r.top < vh && r.bottom > 0) return
        if (el.hasAttribute('data-reveal-group')) {
          Array.from(el.children).forEach(c => c.setAttribute('data-reveal-state', 'hidden'))
          groupFor.set(el.parentElement, el)
          io.observe(el.parentElement)
        } else {
          el.setAttribute('data-reveal-state', 'hidden')
          io.observe(el)
        }
      })
    }

    const raf = requestAnimationFrame(() => scan(true))

    let pending = 0
    const mo = new MutationObserver(() => {
      if (pending) return
      pending = requestAnimationFrame(() => { pending = 0; scan(false) })
    })
    mo.observe(root, { childList: true, subtree: true })

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(pending)
      mo.disconnect()
      io.disconnect()
    }
  }, [rootRef, key])
}

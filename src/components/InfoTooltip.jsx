import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Small "i" button with a floating description.
// - Opens on hover (with a short close delay so the pointer can travel onto
//   the bubble), on keyboard focus, and on click/tap (touch has no hover).
// - Closes on mouse leave, blur, Escape, a second click, or a click outside.
// - Rendered in a portal with fixed positioning, so card `overflow: hidden`
//   can't clip it; prefers above the icon, flips below when there's no
//   room, and is clamped to the viewport horizontally.
// - Fade + 4px slide: 200ms ease-out in, 160ms ease-in out (see CSS).
const GAP = 8
const EDGE = 12
const CLOSE_DELAY = 120
const OUT_MS = 160

export default function InfoTooltip({ label, title, children, className = '' }) {
  const id = useId()
  const btnRef = useRef(null)
  const tipRef = useRef(null)
  const closeTimer = useRef(null)
  const outTimer = useRef(null)
  const [phase, setPhase] = useState('closed') // closed | open | closing
  const [pos, setPos] = useState({ top: -9999, left: -9999, placement: 'top', arrowLeft: 0 })
  const mounted = phase !== 'closed'
  // Visible class lags mounting by one frame so the fade-in transition
  // actually runs (it would otherwise start already at its end state).
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (phase !== 'open') { setShown(false); return }
    const raf = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const openedAt = useRef(0)
  const open = useCallback(() => {
    clearTimeout(closeTimer.current)
    clearTimeout(outTimer.current)
    setPhase(p => { if (p !== 'open') openedAt.current = Date.now(); return 'open' })
  }, [])

  const close = useCallback((immediate = false) => {
    clearTimeout(closeTimer.current)
    const run = () => {
      setPhase(p => (p === 'closed' ? p : 'closing'))
      clearTimeout(outTimer.current)
      outTimer.current = setTimeout(() => setPhase('closed'), OUT_MS)
    }
    if (immediate) run()
    else closeTimer.current = setTimeout(run, CLOSE_DELAY)
  }, [])

  const place = useCallback(() => {
    const btn = btnRef.current
    const tip = tipRef.current
    if (!btn || !tip) return
    const b = btn.getBoundingClientRect()
    const t = tip.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const vh = window.innerHeight
    const fitsAbove = b.top - GAP - t.height >= EDGE
    const fitsBelow = b.bottom + GAP + t.height <= vh - EDGE
    const placement = fitsAbove || !fitsBelow ? 'top' : 'bottom'
    const top = placement === 'top' ? b.top - GAP - t.height : b.bottom + GAP
    const center = b.left + b.width / 2
    const left = Math.min(Math.max(center - t.width / 2, EDGE), vw - EDGE - t.width)
    setPos({ top, left, placement, arrowLeft: Math.min(Math.max(center - left, 14), t.width - 14) })
  }, [])

  useLayoutEffect(() => {
    if (mounted) place()
  }, [mounted, place])

  useEffect(() => {
    if (!mounted) return
    const onKey = e => {
      if (e.key === 'Escape') { close(true); btnRef.current?.focus() }
    }
    const onDown = e => {
      if (btnRef.current?.contains(e.target) || tipRef.current?.contains(e.target)) return
      close(true)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('scroll', place, { passive: true })
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', place)
      window.removeEventListener('resize', place)
    }
  }, [mounted, close, place])

  useEffect(() => () => { clearTimeout(closeTimer.current); clearTimeout(outTimer.current) }, [])

  // Hover handlers only for real mouse pointers — on touch, the click
  // handler alone toggles (otherwise the synthetic mouseenter opens it and
  // the click immediately closes it again).
  const onEnter = e => { if (e.pointerType === 'mouse') open() }
  const onLeave = e => { if (e.pointerType === 'mouse') close() }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`info-tip-btn ${className}`}
        aria-label={label}
        aria-expanded={phase === 'open'}
        aria-describedby={mounted ? id : undefined}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onFocus={open}
        onBlur={e => { if (!tipRef.current?.contains(e.relatedTarget)) close(true) }}
        // A tap fires focus (which opens) then click: ignore a click landing
        // right after that same opening, so the first tap doesn't toggle it
        // straight back closed.
        onClick={() => {
          if (phase === 'open' && Date.now() - openedAt.current > 350) close(true)
          else open()
        }}
      >
        <i className="fas fa-info" aria-hidden="true" />
      </button>
      {mounted && createPortal(
        <div
          ref={tipRef}
          id={id}
          role="tooltip"
          className={`info-tip info-tip-${pos.placement}${shown ? ' is-open' : ''}`}
          style={{ top: pos.top, left: pos.left, '--arrow-left': `${pos.arrowLeft}px` }}
          onPointerEnter={onEnter}
          onPointerLeave={onLeave}
        >
          {title && <p className="info-tip-title">{title}</p>}
          <div className="info-tip-body">{children}</div>
        </div>,
        document.body
      )}
    </>
  )
}

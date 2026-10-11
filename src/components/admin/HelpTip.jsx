import { useEffect, useRef, useState } from 'react'

// Small "ⓘ" trigger that reveals a short explanation on click — used in
// place of permanent paragraphs of help text cluttering a form (e.g. the
// Tarification tab). Click-to-toggle rather than hover so it works the same
// on mobile (no hover state) and desktop, and closes on blur so it never
// gets stuck open after clicking elsewhere.
//
// The bubble is centered on the icon by default (see .help-tip-bubble CSS),
// but the icon itself can end up anywhere horizontally — after a short
// label, or after text that's wrapped onto a new line right at the edge of
// a narrow mobile modal — so plain centering still let it run off-screen
// and get clipped. Once open, this measures the bubble's actual rendered
// position and nudges it back inside the viewport with an extra transform
// offset; the arrow (::after, via --arrow-shift) gets the opposite
// correction so it still points back at the icon instead of drifting off
// with the rest of the bubble.
export default function HelpTip({ text }) {
  const [open, setOpen] = useState(false)
  const [shift, setShift] = useState(0)
  const bubbleRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const bubble = bubbleRef.current
    if (!bubble) return
    const r = bubble.getBoundingClientRect()
    const margin = 10
    let delta = 0
    if (r.left < margin) delta = margin - r.left
    else if (r.right > window.innerWidth - margin) delta = (window.innerWidth - margin) - r.right
    if (delta) setShift(delta)
  }, [open])

  return (
    <span className="help-tip">
      <button
        type="button"
        className="help-tip-btn"
        onClick={() => { setShift(0); setOpen(o => !o) }}
        onBlur={() => setOpen(false)}
        aria-label="Aide"
        aria-expanded={open}
      >
        <i className="fas fa-info" />
      </button>
      {open && (
        <span
          ref={bubbleRef}
          className="help-tip-bubble"
          style={{ transform: `translateX(calc(-50% + ${shift}px))`, '--arrow-shift': `${-shift}px` }}
        >
          {text}
        </span>
      )}
    </span>
  )
}

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Icon from './Icon.jsx'

// Header "Mon compte" icon + dropdown. Opens on mouse hover and on click/tap;
// allows a small grace period on mouse leave, then closes on outside click,
// Escape, focus leaving, or navigation.
//
const CLOSE_DELAY = 120

export default function AccountMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const closeTimer = useRef(null)
  // 'hover' | 'click': a click on a hover-opened menu keeps it open
  // instead of toggling it shut under the cursor.
  const openedBy = useRef(null)

  useEffect(() => {
    const close = () => setOpen(false)
    router.events.on('routeChangeStart', close)
    return () => router.events.off('routeChangeStart', close)
  }, [router.events])

  useEffect(() => {
    if (!open) return
    const onPointerDown = e => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    const onKey = e => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  const onPointerEnter = e => {
    if (e.pointerType !== 'mouse') return
    clearTimeout(closeTimer.current)
    if (!open) { openedBy.current = 'hover'; setOpen(true) }
  }
  const onPointerLeave = e => {
    if (e.pointerType !== 'mouse') return
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY)
  }
  const onButtonClick = () => {
    clearTimeout(closeTimer.current)
    if (open && openedBy.current === 'hover') { openedBy.current = 'click'; return }
    openedBy.current = 'click'
    setOpen(o => !o)
  }
  const onBlur = e => {
    if (open && !wrapRef.current?.contains(e.relatedTarget)) setOpen(false)
  }
  return (
    <div
      ref={wrapRef}
      className={`oah-account${open ? ' is-open' : ''}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onBlur={onBlur}
    >
      <button
        ref={buttonRef}
        type="button"
        className="oah-icon"
        aria-label="Mon compte"
        aria-expanded={open}
        aria-controls="oah-account-menu"
        onClick={onButtonClick}
      >
        <Icon name="person" ion size={32} />
        <span className="oah-tooltip" aria-hidden="true">Mon compte</span>
      </button>

      <div id="oah-account-menu" className="oah-account-menu" inert={open ? undefined : ''}>
        <ul className="oah-account-list">
          <li>
            <Link href="/mon-compte" className="oah-account-item">
              <Icon name="person" size={18} strokeWidth={1.5} />
              Mon compte
            </Link>
          </li>
          <li>
            <Link href="/devis" className="oah-account-item">
              <Icon name="calculator" size={18} strokeWidth={1.5} />
              Devis
            </Link>
          </li>
          <li>
            <Link href="/suivi" className="oah-account-item">
              <Icon name="truck" size={18} strokeWidth={1.5} />
              Suivre commande
            </Link>
          </li>
        </ul>
        <div className="oah-account-sep" role="presentation" />
        <Link href="/mon-compte/deconnexion" className="oah-account-item">
          <Icon name="logOut" size={18} strokeWidth={1.5} />
          Déconnecter
        </Link>
      </div>
    </div>
  )
}

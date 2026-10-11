import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Icon from './Icon.jsx'
import { SITE } from '../lib/site.js'

// Phone dropdown modelled on the /example header. It shares the account
// menu's hover/click/keyboard behaviour so both controls feel identical.
const CLOSE_DELAY = 120

export default function ContactMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const closeTimer = useRef(null)
  const openedBy = useRef(null)

  useEffect(() => {
    const close = () => setOpen(false)
    router.events.on('routeChangeStart', close)
    return () => router.events.off('routeChangeStart', close)
  }, [router.events])

  useEffect(() => {
    if (!open) return
    const onPointerDown = event => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = event => {
      if (event.key !== 'Escape') return
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

  const onPointerEnter = event => {
    if (event.pointerType !== 'mouse') return
    clearTimeout(closeTimer.current)
    if (!open) {
      openedBy.current = 'hover'
      setOpen(true)
    }
  }
  const onPointerLeave = event => {
    if (event.pointerType !== 'mouse') return
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY)
  }
  const onButtonClick = () => {
    clearTimeout(closeTimer.current)
    if (open && openedBy.current === 'hover') {
      openedBy.current = 'click'
      return
    }
    openedBy.current = 'click'
    setOpen(value => !value)
  }
  const onBlur = event => {
    if (open && !wrapRef.current?.contains(event.relatedTarget)) setOpen(false)
  }

  return (
    <div
      ref={wrapRef}
      className={`oah-account oah-contact-menu oah-icon-secondary${open ? ' is-open' : ''}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onBlur={onBlur}
    >
      <button
        ref={buttonRef}
        type="button"
        className="oah-icon"
        aria-label="Nous contacter"
        aria-expanded={open}
        aria-controls="oah-contact-menu"
        onClick={onButtonClick}
      >
        <Icon name="phone" ion size={32} />
        <span className="oah-tooltip" aria-hidden="true">Nous contacter</span>
      </button>

      <div id="oah-contact-menu" className="oah-account-menu" inert={open ? undefined : ''}>
        <ul className="oah-account-list">
          <li>
            {SITE.phone ? (
              <a href={`tel:${SITE.phone}`} className="oah-account-item">
                <Icon name="headset" size={18} strokeWidth={1.5} />
                Nous appeler
              </a>
            ) : (
              <Link href="/contact" className="oah-account-item">
                <Icon name="headset" size={18} strokeWidth={1.5} />
                Téléphone sur demande
              </Link>
            )}
          </li>
          <li>
            <a href={`mailto:${SITE.email}`} className="oah-account-item">
              <Icon name="mail" size={18} strokeWidth={1.5} />
              Nous écrire
            </a>
          </li>
          <li>
            <Link href="/contact" className="oah-account-item">
              <Icon name="users" size={18} strokeWidth={1.5} />
              Formulaire de contact
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Icon from './Icon.jsx'
import { CUSTOMER_AUTH_EVENT, fetchCustomerSession } from '../lib/customer-session.js'

// Header "Mon compte" icon + hover dropdown. Clicking always navigates to
// the login page (or dashboard when authenticated); the hover panel keeps
// the quick account links available on desktop.
//
const CLOSE_DELAY = 120

export default function AccountMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const closeTimer = useRef(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    let active = true
    const sync = () => fetchCustomerSession().then(current => { if (active) setUser(current) })
    sync()
    window.addEventListener(CUSTOMER_AUTH_EVENT, sync)
    return () => { active = false; window.removeEventListener(CUSTOMER_AUTH_EVENT, sync) }
  }, [])

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
    if (!open) setOpen(true)
  }
  const onPointerLeave = e => {
    if (e.pointerType !== 'mouse') return
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY)
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
      <Link
        ref={buttonRef}
        href={user ? '/mon-compte' : '/mon-compte/connexion'}
        className="oah-icon"
        aria-label="Mon compte"
        onClick={() => setOpen(false)}
      >
        <Icon name="person" ion size={32} />
        <span className="oah-tooltip" aria-hidden="true">Mon compte</span>
      </Link>

      <div id="oah-account-menu" className="oah-account-menu" inert={open ? undefined : ''}>
        <ul className="oah-account-list">
          {user ? <>
            <li><Link href="/mon-compte" className="oah-account-item"><Icon name="person" size={18} strokeWidth={1.5} />Mon compte</Link></li>
            <li><Link href="/devis" className="oah-account-item"><Icon name="calculator" size={18} strokeWidth={1.5} />Devis</Link></li>
            <li><Link href="/suivi" className="oah-account-item"><Icon name="truck" size={18} strokeWidth={1.5} />Suivre commande</Link></li>
          </> : <>
            <li><Link href="/mon-compte/connexion" className="oah-account-item"><Icon name="logIn" size={18} strokeWidth={1.5} />Me connecter</Link></li>
            <li><Link href="/mon-compte/inscription" className="oah-account-item"><Icon name="person" size={18} strokeWidth={1.5} />Créer mon compte</Link></li>
          </>}
        </ul>
        {user && <><div className="oah-account-sep" role="presentation" /><Link href="/mon-compte/deconnexion" className="oah-account-item"><Icon name="logOut" size={18} strokeWidth={1.5} />Déconnecter</Link></>}
      </div>
    </div>
  )
}

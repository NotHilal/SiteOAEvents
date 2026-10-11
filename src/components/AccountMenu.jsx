import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase.js'
import Icon from './Icon.jsx'

// Header "Mon compte" icon + dropdown. Opens on mouse hover and on click/tap;
// allows a small grace period on mouse leave, then closes on outside click,
// Escape, focus leaving, or navigation.
//
// The only login the site has is the Espace OA (admin) one, so that's what
// "Se connecter" leads to and what "Se déconnecter" ends — read from the
// real session (supabase.auth shim over /api/auth/login), never faked.
const CLOSE_DELAY = 120

export default function AccountMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const closeTimer = useRef(null)
  // 'hover' | 'click': a click on a hover-opened menu keeps it open
  // instead of toggling it shut under the cursor.
  const openedBy = useRef(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setSignedIn(!!session))
    return () => subscription.unsubscribe()
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
  const signOut = async () => {
    await supabase.auth.signOut()
    setOpen(false)
    buttonRef.current?.focus()
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
            <Link href="/suivi" className="oah-account-item">
              <Icon name="truck" size={18} strokeWidth={1.5} />
              Suivi de commande
            </Link>
          </li>
          <li>
            <Link href="/devis" className="oah-account-item">
              <Icon name="calculator" size={18} strokeWidth={1.5} />
              Demander un devis
            </Link>
          </li>
        </ul>
        <div className="oah-account-sep" role="presentation" />
        {signedIn ? (
          <button type="button" className="oah-account-item" onClick={signOut}>
            <Icon name="logOut" size={18} strokeWidth={1.5} />
            Se déconnecter
          </button>
        ) : (
          <Link href="/espace-oa" className="oah-account-item">
            <Icon name="logIn" size={18} strokeWidth={1.5} />
            Se connecter
          </Link>
        )}
      </div>
    </div>
  )
}

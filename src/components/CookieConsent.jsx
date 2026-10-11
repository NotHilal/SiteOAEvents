import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  getConsent, setConsent, HAS_OPTIONAL_TRACKERS, ANALYTICS_AVAILABLE,
  CONSENT_EVENT, OPEN_SETTINGS_EVENT,
} from '../lib/consent.js'
import { loadAnalytics, unloadAnalytics } from '../lib/analytics.js'

// Discreet bottom banner (only when an optional tracker is configured and
// no valid choice is stored) + a settings dialog reachable at any time from
// the footer. "Tout refuser" is exactly as easy as "Tout accepter"; nothing
// is pre-checked.
export default function CookieConsent() {
  const [bannerOpen, setBannerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const dialogRef = useRef(null)
  const lastFocus = useRef(null)

  useEffect(() => {
    const c = getConsent()
    if (c) {
      setAnalytics(!!c.analytics)
      if (c.analytics) loadAnalytics()
    } else if (HAS_OPTIONAL_TRACKERS) {
      setBannerOpen(true)
    }
    const onOpen = () => {
      lastFocus.current = document.activeElement
      setAnalytics(!!getConsent()?.analytics)
      setSettingsOpen(true)
    }
    const onChange = e => {
      if (e.detail?.analytics) loadAnalytics()
      else unloadAnalytics()
    }
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen)
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => {
      window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen)
      window.removeEventListener(CONSENT_EVENT, onChange)
    }
  }, [])

  useEffect(() => {
    if (!settingsOpen) return
    dialogRef.current?.querySelector('button, input')?.focus()
    const onKey = e => { if (e.key === 'Escape') closeSettings() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen])

  function closeSettings() {
    setSettingsOpen(false)
    lastFocus.current?.focus?.()
  }
  function decide(value) {
    setConsent({ analytics: value })
    setAnalytics(value)
    setBannerOpen(false)
    setSettingsOpen(false)
  }
  function save() {
    decide(analytics)
  }

  return (
    <>
      {bannerOpen && !settingsOpen && (
        <div className="cc-banner" role="region" aria-label="Préférences de cookies">
          <p className="cc-text">
            Nous utilisons uniquement des cookies nécessaires au fonctionnement du site et, avec votre accord, un
            outil de mesure d'audience sans publicité.{' '}
            <Link href="/confidentialite">En savoir plus</Link>
          </p>
          <div className="cc-actions">
            <button type="button" className="cc-btn" onClick={() => decide(false)}>Tout refuser</button>
            <button type="button" className="cc-btn" onClick={() => { lastFocus.current = document.activeElement; setSettingsOpen(true) }}>Personnaliser</button>
            <button type="button" className="cc-btn" onClick={() => decide(true)}>Tout accepter</button>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="cc-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeSettings() }}>
          <div className="cc-dialog" role="dialog" aria-modal="true" aria-labelledby="cc-title" ref={dialogRef}>
            <h2 id="cc-title" className="cc-title">Gestion des cookies</h2>
            <div className="cc-row">
              <div>
                <p className="cc-row-title">Strictement nécessaires</p>
                <p className="cc-row-text">Panier, mémorisation de vos choix, sécurité. Toujours actifs, ils ne nécessitent pas de consentement.</p>
              </div>
              <span className="cc-always">Toujours actifs</span>
            </div>
            {ANALYTICS_AVAILABLE ? (
              <div className="cc-row">
                <div>
                  <p className="cc-row-title"><label htmlFor="cc-analytics">Mesure d'audience</label></p>
                  <p className="cc-row-text">Statistiques de visite anonymes (pages vues, provenance) pour améliorer le site. Aucune publicité.</p>
                </div>
                <input
                  id="cc-analytics"
                  type="checkbox"
                  role="switch"
                  className="cc-switch"
                  checked={analytics}
                  onChange={e => setAnalytics(e.target.checked)}
                />
              </div>
            ) : (
              <p className="cc-row-text cc-note">Aucun outil de mesure d'audience ni cookie publicitaire n'est utilisé actuellement.</p>
            )}
            <div className="cc-actions">
              {ANALYTICS_AVAILABLE ? (
                <>
                  <button type="button" className="cc-btn" onClick={() => decide(false)}>Tout refuser</button>
                  <button type="button" className="cc-btn" onClick={() => decide(true)}>Tout accepter</button>
                  <button type="button" className="cc-btn cc-btn-strong" onClick={save}>Enregistrer</button>
                </>
              ) : (
                <button type="button" className="cc-btn cc-btn-strong" onClick={closeSettings}>Fermer</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

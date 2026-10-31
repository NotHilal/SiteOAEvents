import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Seo from './Seo.jsx'
import { notifyCustomerAuthChanged } from '../lib/customer-session.js'

export default function PasswordRecovery({ reset = false }) {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const title = reset ? 'Choisir un nouveau mot de passe' : 'Mot de passe oublié'
  const route = reset ? '/mon-compte/reinitialiser-mot-de-passe' : '/mon-compte/mot-de-passe-oublie'

  useEffect(() => {
    if (reset) setToken(new URLSearchParams(window.location.hash.slice(1)).get('token') || '')
  }, [reset])

  async function submit(event) {
    event.preventDefault()
    setError(''); setMessage('')
    if (reset && password !== confirmation) { setError('Les deux mots de passe doivent être identiques.'); return }
    setLoading(true)
    try {
      const response = await fetch(reset ? '/api/account/reset-password' : '/api/account/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reset ? { token, password, confirmation } : { email }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'La demande n’a pas pu aboutir. Réessayez.')
      setMessage(result.message)
      if (reset) {
        setPassword(''); setConfirmation('')
        window.history.replaceState(window.history.state, '', window.location.pathname)
        notifyCustomerAuthChanged()
      }
    } catch (err) { setError(err.message || 'Connexion indisponible. Réessayez.') }
    finally { setLoading(false) }
  }

  const invalid = reset && token !== null && !/^[a-f0-9]{64}$/.test(token)
  return <>
    <Seo title={title} description="Réinitialisez le mot de passe de votre compte client OA Événementiel." path={route} noindex />
    <Head><meta name="referrer" content="no-referrer" /></Head>
    <main className="oa-auth-page">
      <section className="oa-auth-intro"><div className="oa-container">
        <nav className="oa-account-breadcrumb" aria-label="Fil d’Ariane"><Link href="/">Accueil</Link><span aria-hidden="true">/</span><Link href="/mon-compte/connexion">Accès client</Link><span aria-hidden="true">/</span><span aria-current="page">{reset ? 'Nouveau mot de passe' : 'Mot de passe oublié'}</span></nav>
        <h1>{title}</h1>
      </div></section>
      <section className="oa-container oa-recovery-container"><div className="oa-auth-panel">
        {message ? <>
          <p role="status">{message}</p>
          {!reset && <p>Si vous ne recevez rien, vérifiez les courriers indésirables ou <Link href="/contact">contactez-nous</Link>.</p>}
          <Link href="/mon-compte/connexion" className="oa-auth-primary">Retour à la connexion</Link>
        </> : invalid ? <>
          <p role="alert">Ce lien est absent ou invalide. Demandez un nouveau lien pour réinitialiser votre mot de passe.</p>
          <Link href="/mon-compte/mot-de-passe-oublie" className="oa-auth-primary">Demander un nouveau lien</Link>
        </> : <>
          <p>{reset ? 'Choisissez un mot de passe différent de ceux que vous utilisez sur d’autres sites. Les anciennes sessions seront déconnectées après le changement.' : 'Indiquez l’adresse email de votre compte client pour recevoir un lien de réinitialisation valable 30 minutes.'}</p>
          {error && <div className="oa-auth-alert" role="alert">{error}{reset && <p><Link href="/mon-compte/mot-de-passe-oublie">Demander un nouveau lien</Link></p>}</div>}
          <form className="oa-auth-form" onSubmit={submit}>
            <fieldset disabled={loading || (reset && token === null)} className="oa-recovery-fields">
              {reset ? <>
                <label htmlFor="reset-password">Nouveau mot de passe *</label>
                <input id="reset-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} aria-describedby="reset-password-help" />
                <p id="reset-password-help">Entre 8 et 128 caractères, avec au moins une lettre et un chiffre.</p>
                <label htmlFor="reset-confirmation">Confirmer le nouveau mot de passe *</label>
                <input id="reset-confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} required value={confirmation} onChange={e => setConfirmation(e.target.value)} />
                <button type="button" className="oa-auth-text-link oa-recovery-visibility" onClick={() => setShowPassword(value => !value)} aria-pressed={showPassword}>{showPassword ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}</button>
              </> : <>
                <label htmlFor="recovery-email">Adresse email *</label>
                <input id="recovery-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} />
              </>}
              <div className="oa-auth-actions"><button type="submit" className="oa-auth-primary">{loading ? 'Traitement en cours…' : reset ? 'Enregistrer le nouveau mot de passe' : 'Recevoir un lien de réinitialisation'}</button></div>
            </fieldset>
          </form>
          <Link href="/mon-compte/connexion" className="oa-auth-text-link">Retour à la connexion</Link>
        </>}
      </div></section>
    </main>
  </>
}

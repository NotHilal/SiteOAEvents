import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Seo from '../../src/components/Seo.jsx'
import { fetchCustomerSession, notifyCustomerAuthChanged } from '../../src/lib/customer-session.js'

function safeNext(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/mon-compte'
}

export default function ConnexionCompte() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!router.isReady) return
    fetchCustomerSession().then(user => {
      if (user) router.replace(safeNext(router.query.next))
    })
  }, [router.isReady, router.query.next])

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/account/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Connexion impossible.')
      notifyCustomerAuthChanged()
      await router.push(safeNext(router.query.next))
    } catch (err) {
      setError(err.message || 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Seo title="Accès client" description="Connectez-vous à votre espace client OA Événementiel." path="/mon-compte/connexion" noindex />
      <main className="oa-auth-page">
        <section className="oa-auth-intro">
          <div className="oa-container">
            <nav className="oa-account-breadcrumb" aria-label="Fil d’Ariane">
              <Link href="/">Accueil</Link><span aria-hidden="true">/</span><span aria-current="page">Accès client</span>
            </nav>
            <span className="oa-auth-kicker">Espace personnel</span>
            <h1>Accès client</h1>
          </div>
        </section>

        <section className="oa-container oa-auth-login-grid">
          <div className="oa-auth-panel">
            <h2>Déjà client ?</h2>
            <p>Si vous avez un compte, connectez-vous avec votre adresse email.</p>
            {error && <div className="oa-auth-alert" role="alert">{error}</div>}
            <form className="oa-auth-form" onSubmit={handleSubmit}>
              <label htmlFor="customer-email">Adresse email *</label>
              <input id="customer-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required />
              <label htmlFor="customer-password">Mot de passe *</label>
              <div className="oa-auth-password">
                <input id="customer-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
                <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                  <i className={`far ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
              <div className="oa-auth-actions">
                <button type="submit" className="oa-auth-primary" disabled={loading}>{loading ? 'Connexion…' : 'Me connecter'}</button>
                <Link href="/mon-compte/mot-de-passe-oublie" className="oa-auth-text-link">Mot de passe oublié ?</Link>
              </div>
            </form>
          </div>

          <div className="oa-auth-panel oa-auth-new-customer">
            <h2>Nouveau client ?</h2>
            <p>Créez votre compte en quelques instants afin d’effectuer et suivre vos demandes de devis et retrouver vos informations.</p>
            <ul>
              <li>Vos coordonnées enregistrées</li>
              <li>Le suivi de vos demandes</li>
              <li>Votre sélection et vos préférences</li>
            </ul>
            <Link href="/mon-compte/inscription" className="oa-auth-primary">Créer mon compte</Link>
          </div>
        </section>
      </main>
    </>
  )
}

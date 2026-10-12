import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Seo from '../../src/components/Seo.jsx'
import { notifyCustomerAuthChanged } from '../../src/lib/customer-session.js'
import { formatFrenchPhone, normalizeFrenchPhone } from '../../src/lib/french-phone.js'

function PasswordEye({ visible }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6S2.25 12 2.25 12Z" />
      <circle cx="12" cy="12" r="2.75" />
      {visible && <path d="M3.5 3.5 20.5 20.5" />}
    </svg>
  )
}

export default function InscriptionCompte() {
  const router = useRouter()
  const [accountType, setAccountType] = useState('particulier')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '')
    const confirmation = String(form.get('passwordConfirmation') || '')
    if (password !== confirmation) { setError('Les deux mots de passe ne correspondent pas.'); return }

    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/account/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: form.get('email'), password,
          firstName: form.get('firstName'), lastName: form.get('lastName'), phone: normalizeFrenchPhone(phone),
          civility: form.get('civility'), accountType, companyName: form.get('companyName'),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Création du compte impossible.')
      notifyCustomerAuthChanged()
      await router.push('/mon-compte')
    } catch (err) {
      setError(err.message || 'Création du compte impossible.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Seo title="Créer un compte client" description="Créez votre espace client OA Événementiel." path="/mon-compte/inscription" noindex />
      <main className="oa-auth-page">
        <section className="oa-auth-intro">
          <div className="oa-container">
            <nav className="oa-account-breadcrumb" aria-label="Fil d’Ariane">
              <Link href="/">Accueil</Link><span aria-hidden="true">/</span><Link href="/mon-compte/connexion">Accès client</Link><span aria-hidden="true">/</span><span aria-current="page">Créer un compte</span>
            </nav>
            <span className="oa-auth-kicker">Nouveau client</span>
            <h1>Créer un nouveau compte client</h1>
          </div>
        </section>

        <section className="oa-container oa-register-wrap">
          {error && <div className="oa-auth-alert" role="alert">{error}</div>}
          <form className="oa-register-form" onSubmit={handleSubmit}>
            <fieldset>
              <legend>Informations de connexion</legend>
              <div className="oa-register-grid">
                <label className="oa-register-full">Adresse email *<input type="email" name="email" autoComplete="email" required /></label>
                <label>
                  Mot de passe *
                  <span className="oa-auth-password">
                    <input type={showPassword ? 'text' : 'password'} name="password" autoComplete="new-password" minLength="8" required />
                    <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                      <PasswordEye visible={showPassword} />
                    </button>
                  </span>
                  <small>8 caractères minimum, avec au moins une lettre et un chiffre.</small>
                </label>
                <label>
                  Confirmer le mot de passe *
                  <span className="oa-auth-password">
                    <input type={showConfirmation ? 'text' : 'password'} name="passwordConfirmation" autoComplete="new-password" minLength="8" required />
                    <button type="button" onClick={() => setShowConfirmation(value => !value)} aria-label={showConfirmation ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} title={showConfirmation ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                      <PasswordEye visible={showConfirmation} />
                    </button>
                  </span>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Informations personnelles</legend>
              <div className="oa-account-type" role="radiogroup" aria-label="Type de client">
                <label><input type="radio" name="accountType" value="particulier" checked={accountType === 'particulier'} onChange={() => setAccountType('particulier')} /> Je suis un particulier</label>
                <label><input type="radio" name="accountType" value="professionnel" checked={accountType === 'professionnel'} onChange={() => setAccountType('professionnel')} /> Je suis un professionnel</label>
              </div>
              <div className="oa-register-grid">
                <label>Civilité<select name="civility" defaultValue=""><option value="">— Faire un choix —</option><option value="monsieur">Monsieur</option><option value="madame">Madame</option><option value="mx">Mx</option></select></label>
                {accountType === 'professionnel' && <label>Entreprise *<input type="text" name="companyName" autoComplete="organization" required /></label>}
                <label>Prénom *<input type="text" name="firstName" autoComplete="given-name" required /></label>
                <label>Nom *<input type="text" name="lastName" autoComplete="family-name" required /></label>
                <label className="oa-register-full">
                  Téléphone *
                  <span className="oa-french-phone">
                    <span className="oa-french-phone-prefix" aria-hidden="true">+33</span>
                    <input
                      type="tel"
                      name="phone"
                      autoComplete="tel-national"
                      inputMode="numeric"
                      placeholder="6 12 34 56 78"
                      value={phone}
                      onChange={event => setPhone(formatFrenchPhone(event.target.value))}
                      pattern="[1-9](?: [0-9]{2}){4}"
                      maxLength="13"
                      title="Saisissez un chiffre, puis quatre groupes de deux chiffres, par exemple 6 12 34 56 78."
                      required
                    />
                    <span className="oa-french-phone-flag" role="img" aria-label="France">🇫🇷</span>
                  </span>
                  <small>Format français : un chiffre, puis quatre groupes de deux chiffres.</small>
                </label>
              </div>
            </fieldset>

            <label className="oa-register-consent">
              <input type="checkbox" required />
              <span>J’accepte que mes informations soient utilisées pour gérer mon compte et mes demandes, conformément à la <Link href="/confidentialite">politique de confidentialité</Link>.</span>
            </label>
            <div className="oa-register-actions">
              <button type="submit" className="oa-auth-primary" disabled={loading}>{loading ? 'Création…' : 'Créer mon compte'}</button>
              <span>Vous avez déjà un compte ? <Link href="/mon-compte/connexion">Me connecter</Link></span>
            </div>
          </form>
        </section>
      </main>
    </>
  )
}

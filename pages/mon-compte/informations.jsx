import { useEffect, useState } from 'react'
import Seo from '../../src/components/Seo.jsx'
import AccountLayout, { AccountSection } from '../../src/components/AccountLayout.jsx'

const EMPTY_FORM = { firstName:'', lastName:'', email:'', phone:'', accountType:'particulier', companyName:'' }

export default function InformationsCompte() {
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    fetch('/api/account/profile', { credentials:'same-origin' })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(({ user }) => setForm({
        firstName:user.firstName || '', lastName:user.lastName || '', email:user.email || '',
        phone:user.phone || '', accountType:user.accountType || 'particulier', companyName:user.companyName || '',
      }))
      .catch(() => setError('Impossible de charger vos informations.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaved(false)
    setError('')
    const response = await fetch('/api/account/profile', {
      method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body:JSON.stringify(form),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) { setError(data.message || 'Impossible d’enregistrer vos informations.'); return }
    setForm(current => ({ ...current, ...data.user }))
    setSaved(true)
  }

  return (
    <>
      <Seo title="Informations du compte" description="Gérez vos informations de compte OA Événementiel." path="/mon-compte/informations" noindex />
      <AccountLayout title="Informations du compte" description="Gérez les informations associées à votre compte.">
        <AccountSection title="Vos informations">
          <form className="oa-account-form" onSubmit={handleSubmit} aria-busy={loading}>
            <div className="oa-account-form-grid">
              <label>Prénom<input type="text" name="firstName" autoComplete="given-name" placeholder="Votre prénom" value={form.firstName} onChange={e => setForm({...form,firstName:e.target.value})} required /></label>
              <label>Nom<input type="text" name="lastName" autoComplete="family-name" placeholder="Votre nom" value={form.lastName} onChange={e => setForm({...form,lastName:e.target.value})} required /></label>
              <label className="oa-account-form-full">Adresse e-mail<input type="email" name="email" autoComplete="email" value={form.email} readOnly aria-describedby="account-email-note" /></label>
              <label className="oa-account-form-full">Téléphone<input type="tel" name="phone" autoComplete="tel" placeholder="Votre numéro de téléphone" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} /></label>
              <label>Type de compte<select value={form.accountType} onChange={e => setForm({...form,accountType:e.target.value})}><option value="particulier">Particulier</option><option value="professionnel">Professionnel</option></select></label>
              {form.accountType === 'professionnel' && <label>Entreprise<input type="text" value={form.companyName} onChange={e => setForm({...form,companyName:e.target.value})} required /></label>}
            </div>
            <div className="oa-account-form-footer">
              <p id="account-email-note">L’adresse email sert d’identifiant de connexion. Contactez-nous si vous devez la modifier.</p>
              <button type="submit" className="oa-account-primary-link oa-account-submit" disabled={loading}>Enregistrer les modifications <span aria-hidden="true">→</span></button>
            </div>
            {saved && <p className="oa-account-form-message" role="status">Vos informations ont été enregistrées.</p>}
            {error && <p className="oa-account-form-error" role="alert">{error}</p>}
          </form>
        </AccountSection>
      </AccountLayout>
    </>
  )
}

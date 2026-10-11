import { useState } from 'react'
import Seo from '../../src/components/Seo.jsx'
import AccountLayout, { AccountSection } from '../../src/components/AccountLayout.jsx'

export default function InformationsCompte() {
  const [saved, setSaved] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setSaved(true)
  }

  return (
    <>
      <Seo title="Informations du compte" description="Gérez vos informations de compte OA Événementiel." path="/mon-compte/informations" noindex />
      <AccountLayout title="Informations du compte" description="Gérez les informations associées à votre compte.">
        <AccountSection title="Vos informations">
          <form className="oa-account-form" onSubmit={handleSubmit}>
            <div className="oa-account-form-grid">
              <label>
                Prénom
                <input type="text" name="firstName" autoComplete="given-name" placeholder="Votre prénom" />
              </label>
              <label>
                Nom
                <input type="text" name="lastName" autoComplete="family-name" placeholder="Votre nom" />
              </label>
              <label className="oa-account-form-full">
                Adresse e-mail
                <input type="email" name="email" autoComplete="email" placeholder="votre@email.fr" />
              </label>
              <label className="oa-account-form-full">
                Téléphone
                <input type="tel" name="phone" autoComplete="tel" placeholder="Votre numéro de téléphone" />
              </label>
            </div>
            <div className="oa-account-form-footer">
              <p>Au moins un numéro de téléphone peut être renseigné pour faciliter le suivi de votre demande.</p>
              <button type="submit" className="oa-account-primary-link oa-account-submit">Enregistrer les modifications <span aria-hidden="true">→</span></button>
            </div>
            {saved && <p className="oa-account-form-message" role="status">Vos informations ont été prises en compte pour cette session.</p>}
          </form>
        </AccountSection>
      </AccountLayout>
    </>
  )
}

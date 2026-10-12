import { useEffect } from 'react'
import Link from 'next/link'
import Icon from '../../src/components/Icon.jsx'
import Seo from '../../src/components/Seo.jsx'
import AccountLayout, { AccountSection } from '../../src/components/AccountLayout.jsx'
import { logoutCustomer } from '../../src/lib/customer-session.js'

export default function Deconnexion() {
  useEffect(() => {
    logoutCustomer()
  }, [])

  return (
    <>
      <Seo title="Vous êtes déconnecté" description="Votre session OA Événementiel a été fermée." path="/mon-compte/deconnexion" noindex />
      <AccountLayout title="Vous êtes déconnecté" description="Votre session a bien été fermée." requireAuth={false}>
        <AccountSection className="oa-account-empty-state oa-account-logout-state">
          <span className="oa-account-empty-icon is-success"><Icon name="check" size={30} strokeWidth={1.5} /></span>
          <h2>À bientôt</h2>
          <p>Vous êtes à présent déconnecté(e). Vous pouvez retourner à l’accueil ou continuer à découvrir nos prestations.</p>
          <Link href="/mon-compte/connexion" className="oa-account-primary-link">Se reconnecter <span aria-hidden="true">→</span></Link>
        </AccountSection>
      </AccountLayout>
    </>
  )
}

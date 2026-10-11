import Icon from '../../src/components/Icon.jsx'
import Seo from '../../src/components/Seo.jsx'
import AccountLayout, { AccountSection } from '../../src/components/AccountLayout.jsx'

export default function NewsletterCompte() {
  return (
    <>
      <Seo title="Newsletter" description="Gérez votre abonnement à la newsletter OA Événementiel." path="/mon-compte/newsletter" noindex />
      <AccountLayout title="Newsletter" description="Choisissez comment rester informé des nouveautés et inspirations OA Événementiel.">
        <AccountSection className="oa-account-coming-soon">
          <span className="oa-account-feature-icon"><Icon name="mail" size={30} strokeWidth={1.25} /></span>
          <div>
            <span className="oa-account-status">Bientôt disponible</span>
            <h2>La newsletter arrive prochainement</h2>
            <p>La gestion de votre abonnement sera activée dans une prochaine étape. Vous pourrez alors choisir vos préférences directement depuis cet espace.</p>
          </div>
        </AccountSection>
      </AccountLayout>
    </>
  )
}

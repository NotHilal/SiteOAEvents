import Link from 'next/link'
import Icon from '../../src/components/Icon.jsx'
import Seo from '../../src/components/Seo.jsx'
import AccountLayout, { AccountSection } from '../../src/components/AccountLayout.jsx'

export default function DemandesDevis() {
  return (
    <>
      <Seo title="Mes demandes de devis" description="Retrouvez vos demandes de devis OA Événementiel." path="/mon-compte/demandes-de-devis" noindex />
      <AccountLayout title="Mes demandes de devis" description="Suivez vos projets et retrouvez les demandes envoyées à notre équipe.">
        <AccountSection className="oa-account-empty-state">
          <span className="oa-account-empty-icon"><Icon name="calculator" size={30} strokeWidth={1.25} /></span>
          <h2>Aucune demande de devis</h2>
          <p>Vous n’avez pas encore envoyé de demande. Commencez à préparer votre prochain événement.</p>
          <Link href="/devis" className="oa-account-primary-link">Demander un devis <span aria-hidden="true">→</span></Link>
        </AccountSection>
      </AccountLayout>
    </>
  )
}

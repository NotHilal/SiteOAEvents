import Link from 'next/link'
import Icon from '../../src/components/Icon.jsx'
import Seo from '../../src/components/Seo.jsx'
import AccountLayout, { AccountSection } from '../../src/components/AccountLayout.jsx'

export default function ListeEnvies() {
  return (
    <>
      <Seo title="Ma liste d’envies" description="Retrouvez vos produits préférés OA Événementiel." path="/mon-compte/liste-envies" noindex />
      <AccountLayout title="Ma liste d’envies" description="Conservez vos inspirations et vos produits préférés pour votre prochain événement.">
        <AccountSection className="oa-account-empty-state">
          <span className="oa-account-empty-icon"><Icon name="bag" size={30} strokeWidth={1.25} /></span>
          <h2>Votre liste d’envies est vide</h2>
          <p>Ajoutez vos coups de cœur depuis le catalogue pour les retrouver facilement ici.</p>
          <Link href="/catalogue" className="oa-account-primary-link">Explorer le catalogue <span aria-hidden="true">→</span></Link>
        </AccountSection>
      </AccountLayout>
    </>
  )
}

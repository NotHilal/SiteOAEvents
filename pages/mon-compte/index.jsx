import Link from 'next/link'
import Seo from '../../src/components/Seo.jsx'
import Icon from '../../src/components/Icon.jsx'
import AccountLayout, { AccountSection } from '../../src/components/AccountLayout.jsx'

const ACCOUNT_ACTIONS = [
  {
    href: '/mon-compte/informations',
    icon: 'person',
    title: 'Informations du compte',
    text: 'Consultez et mettez à jour vos informations personnelles.',
  },
  {
    href: '/mon-compte/demandes-de-devis',
    icon: 'calculator',
    title: 'Mes demandes de devis',
    text: 'Retrouvez ici vos demandes et l’avancement de vos projets.',
  },
  {
    href: '/mon-compte/newsletter',
    icon: 'mail',
    title: 'Newsletter',
    text: 'Gérez vos préférences de communication avec OA Événementiel.',
  },
  {
    href: '/mon-compte/liste-envies',
    icon: 'bag',
    title: 'Ma liste d’envies',
    text: 'Gardez vos produits préférés à portée de main.',
  },
]

export default function MonCompte() {
  return (
    <>
      <Seo
        title="Mon compte"
        description="Gérez votre compte, vos demandes de devis et votre liste d’envies OA Événementiel."
        path="/mon-compte"
        noindex
      />
      <AccountLayout
        title="Tableau de bord du compte"
        description="Retrouvez au même endroit vos informations et vos demandes auprès d’OA Événementiel."
      >
        <AccountSection className="oa-account-welcome">
          <div>
            <span className="oa-account-kicker">Espace client</span>
            <h2>Bienvenue dans votre espace</h2>
            <p>
              Depuis votre tableau de bord, vous pouvez accéder rapidement aux rubriques de votre compte.
            </p>
          </div>
          <Link href="/catalogue" className="oa-account-primary-link">
            Découvrir le catalogue <span aria-hidden="true">→</span>
          </Link>
        </AccountSection>

        <AccountSection title="Accès rapides">
          <div className="oa-account-action-list">
            {ACCOUNT_ACTIONS.map(action => (
              <Link key={action.href} href={action.href} className="oa-account-action">
                <span className="oa-account-action-icon"><Icon name={action.icon} size={22} strokeWidth={1.35} /></span>
                <span className="oa-account-action-copy">
                  <strong>{action.title}</strong>
                  <span>{action.text}</span>
                </span>
                <span className="oa-account-action-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </AccountSection>
      </AccountLayout>
    </>
  )
}

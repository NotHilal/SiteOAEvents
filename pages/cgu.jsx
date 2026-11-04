import Link from 'next/link'
import LegalPage from '../src/components/LegalPage.jsx'
import { SITE } from '../src/lib/site.js'

export default function Cgu() {
  return (
    <LegalPage
      title="Conditions générales d'utilisation"
      description="Conditions générales d'utilisation du site OA Événementiel : accès, usage du site, formulaires et responsabilités."
      path="/cgu"
      updated="2 novembre 2026"
    >
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions encadrent l'accès et l'utilisation du site OA Événementiel. En naviguant sur le
        site, l'utilisateur les accepte. Les commandes et locations sont régies par les{' '}
        <Link href="/cgv">conditions générales de vente</Link>.
      </p>

      <h2>2. Accès au site</h2>
      <p>
        Le site est accessible gratuitement, sous réserve des frais de connexion à la charge de l'utilisateur.
        OA Événementiel peut suspendre ou modifier tout ou partie du site, notamment pour maintenance, sans
        préavis ni indemnité.
      </p>

      <h2>3. Services proposés</h2>
      <ul>
        <li>présentation du catalogue de location et de nos réalisations ;</li>
        <li>commande et paiement en ligne ;</li>
        <li>espace client pour retrouver ses commandes ;</li>
        <li>suivi de commande à l'aide de l'email et du numéro de commande ;</li>
        <li>formulaire de contact.</li>
      </ul>

      <h2>4. Engagements de l'utilisateur</h2>
      <p>L'utilisateur s'engage à :</p>
      <ul>
        <li>fournir des informations exactes dans les formulaires ;</li>
        <li>ne pas utiliser le site à des fins illicites, frauduleuses ou de prospection non sollicitée ;</li>
        <li>ne pas tenter d'accéder aux espaces réservés ni de perturber le fonctionnement du site (envois automatisés, tentatives d'intrusion…) ;</li>
        <li>conserver la confidentialité de son mot de passe et de son numéro de commande.</li>
      </ul>

      <h2>5. Propriété intellectuelle</h2>
      <p>
        Les contenus du site sont protégés (voir les <Link href="/mentions-legales">mentions légales</Link>). Toute
        réutilisation sans autorisation est interdite.
      </p>

      <h2>6. Responsabilité</h2>
      <p>
        OA Événementiel met en œuvre les moyens raisonnables pour assurer un accès fiable au site, sans garantie
        d'absence d'interruption ou d'erreur. Le prix d'une commande est celui présenté avant le paiement. Les liens
        vers des sites tiers sont fournis à titre informatif ; OA Événementiel n'est pas responsable de leur contenu.
      </p>

      <h2>7. Données personnelles et cookies</h2>
      <p>
        Les données personnelles collectées lors de l'utilisation du site sont régies par notre{' '}
        <Link href="/confidentialite">politique de confidentialité</Link>.
        Pour en savoir plus sur les traceurs et gérer vos préférences, consultez notre{' '}
        <Link href="/cookies">politique relative aux cookies</Link> ou utilisez le lien « Gestion des cookies » en bas de page.
      </p>

      <h2>8. Modification des conditions</h2>
      <p>
        Ces conditions peuvent être modifiées à tout moment. La version applicable est celle en ligne au moment de
        la consultation.
      </p>

      <h2>9. Droit applicable et contact</h2>
      <p>
        Les présentes conditions sont soumises au droit français. Contact :{' '}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>

      <p className="legal-see-also">
        Voir aussi : <Link href="/mentions-legales">Mentions légales</Link> · <Link href="/cgv">CGV</Link> · <Link href="/confidentialite">Confidentialité</Link> · <Link href="/cookies">Cookies</Link>
      </p>
    </LegalPage>
  )
}

import Link from 'next/link'
import LegalPage, { ToFill, ToValidate } from '../src/components/LegalPage.jsx'
import { SITE } from '../src/lib/site.js'
import { openCookieSettings } from '../src/lib/consent.js'

export default function Confidentialite() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      description="Comment OA Événementiel collecte, utilise et protège vos données personnelles, et comment exercer vos droits."
      path="/confidentialite"
      updated="11 octobre 2026"
    >
      <ToValidate>
        cette politique décrit les traitements réellement effectués par le site à la date de sa rédaction.
        Elle doit être relue par un professionnel et mise à jour à chaque nouvel outil ou prestataire.
      </ToValidate>

      <h2>1. Responsable du traitement</h2>
      <p>
        OA Événementiel — <ToFill>raison sociale, adresse du siège</ToFill> — joignable à{' '}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>

      <h2>2. Données collectées et finalités</h2>
      <div className="legal-table-wrap">
      <table className="legal-table">
        <thead>
          <tr><th scope="col">Formulaire / usage</th><th scope="col">Données</th><th scope="col">Finalité</th><th scope="col">Base légale</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Formulaire de contact</td>
            <td>Prénom, nom, email, téléphone (facultatif), type d'événement, message</td>
            <td>Répondre à votre demande d'information ou de devis</td>
            <td>Mesures précontractuelles prises à votre demande (art. 6.1.b RGPD)</td>
          </tr>
          <tr>
            <td>Réservation et simulation de devis</td>
            <td>Prénom, nom, email, téléphone, dates, type d'événement, nombre de personnes, adresse de livraison, matériel choisi, message</td>
            <td>Traiter votre demande, établir le devis, organiser la livraison, assurer le suivi de commande</td>
            <td>Exécution du contrat ou mesures précontractuelles (art. 6.1.b)</td>
          </tr>
          <tr>
            <td>Paiement</td>
            <td>Montants, échéancier, identifiant client Stripe. Les données de carte bancaire sont saisies directement chez Stripe et ne transitent ni ne sont stockées sur nos serveurs.</td>
            <td>Encaisser le prix de la réservation</td>
            <td>Exécution du contrat (art. 6.1.b) et obligations comptables (art. 6.1.c)</td>
          </tr>
          <tr>
            <td>Suivi de commande</td>
            <td>Email et numéro de commande saisis</td>
            <td>Vous permettre de consulter votre demande</td>
            <td>Exécution du contrat (art. 6.1.b)</td>
          </tr>
          <tr>
            <td>Sécurité du site</td>
            <td>Adresse IP (temporairement, en mémoire)</td>
            <td>Limiter les abus (tentatives répétées, spam)</td>
            <td>Intérêt légitime (art. 6.1.f)</td>
          </tr>
          <tr>
            <td>Mesure d'audience (si activée)</td>
            <td>Pages consultées, source de visite, type d'appareil — sans donnée d'identification directe</td>
            <td>Améliorer le site</td>
            <td>Consentement (art. 6.1.a), recueilli via la bannière cookies</td>
          </tr>
        </tbody>
      </table>
      </div>

      <h2>3. Durées de conservation</h2>
      <ul>
        <li>Demandes de contact sans suite : 3 ans à compter du dernier échange.</li>
        <li>Réservations et données clients : durée de la relation commerciale, puis 5 ans (prescription civile).</li>
        <li>Pièces comptables (factures, paiements) : 10 ans (article L123-22 du Code de commerce).</li>
        <li>Données de sécurité (adresses IP en mémoire) : quelques minutes à quelques heures.</li>
        <li>Choix relatifs aux cookies : 6 mois, puis le choix vous est redemandé.</li>
      </ul>
      <p><ToFill>confirmer ou ajuster ces durées selon votre organisation</ToFill></p>

      <h2>4. Destinataires et sous-traitants</h2>
      <p>
        Vos données sont destinées à l'équipe d'OA Événementiel. Elles ne sont jamais vendues. Nous faisons
        appel aux prestataires suivants, uniquement pour les besoins décrits :
      </p>
      <ul>
        <li><strong>Hébergement du site et de la base de données</strong> : <ToFill>nom, pays</ToFill>.</li>
        <li><strong>Web3Forms</strong> : transmission par email des messages du formulaire de contact. <ToFill>localisation des serveurs à vérifier</ToFill></li>
        <li><strong>Resend</strong> (États-Unis) : envoi des emails de suivi de réservation.</li>
        <li><strong>Stripe</strong> (Stripe Payments Europe Ltd, Irlande) : paiement par carte.</li>
        <li><strong>Base Adresse Nationale</strong> (État français) : suggestion d'adresses pendant la saisie.</li>
        <li><strong>OpenStreetMap / Nominatim</strong> et <strong>OSRM</strong> : calcul de la distance de livraison à partir de l'adresse saisie.</li>
        <li><strong>Unsplash</strong> : certaines photos d'illustration sont chargées depuis ses serveurs, qui reçoivent alors votre adresse IP.</li>
      </ul>

      <h2>5. Transferts hors de l'Union européenne</h2>
      <p>
        Certains prestataires (notamment Resend, Stripe et Unsplash) peuvent traiter des données aux
        États-Unis. Ces transferts sont encadrés par le Data Privacy Framework UE–États-Unis et/ou par les
        clauses contractuelles types de la Commission européenne.{' '}
        <ToFill>vérifier la situation de chaque prestataire au moment de la mise en ligne</ToFill>
      </p>

      <h2>6. Cookies et stockage local</h2>
      <p>Le site utilise uniquement, par défaut, des éléments strictement nécessaires à son fonctionnement :</p>
      <ul>
        <li><strong>Panier du catalogue</strong> (stockage local du navigateur) : mémorise les articles choisis.</li>
        <li><strong>Préférences de cookies</strong> (stockage local) : mémorise votre choix.</li>
        <li><strong>Session administrateur</strong> (stockage de session, espace réservé à l'équipe).</li>
      </ul>
      <p>
        Ces éléments sont exemptés de consentement. Les outils de mesure d'audience, s'ils sont activés, ne
        sont chargés qu'après votre accord. Vous pouvez modifier votre choix à tout moment :{' '}
        <button type="button" className="legal-inline-btn" onClick={openCookieSettings}>gérer mes cookies</button>.
      </p>

      <h2>7. Vos droits</h2>
      <p>
        Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de
        rectification, d'effacement, de limitation, d'opposition et de portabilité de vos données, ainsi que du
        droit de retirer votre consentement à tout moment et de définir des directives relatives au sort de vos
        données après votre décès.
      </p>
      <p>
        Pour les exercer, écrivez à <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Nous répondons dans un
        délai d'un mois. Vous pouvez également introduire une réclamation auprès de la CNIL
        (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>).
      </p>

      <h2>8. Sécurité</h2>
      <p>
        Le site est servi en HTTPS. L'accès aux données de réservation est réservé à l'équipe par
        authentification, et la consultation d'une commande en ligne exige à la fois l'email et le numéro de
        commande. Les paiements par carte sont traités par Stripe, certifié PCI-DSS.
      </p>

      <p className="legal-see-also">
        Voir aussi : <Link href="/mentions-legales">mentions légales</Link> · <Link href="/cgu">CGU</Link> · <Link href="/cgv">CGV</Link>
      </p>
    </LegalPage>
  )
}

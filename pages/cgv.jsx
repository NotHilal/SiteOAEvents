import Link from 'next/link'
import LegalPage from '../src/components/LegalPage.jsx'
import { SITE } from '../src/lib/site.js'

export default function Cgv() {
  return (
    <LegalPage
      title="Conditions générales de vente"
      description="Conditions générales de vente et de location d'OA Événementiel : réservation, prix, paiement, livraison, annulation et responsabilités."
      path="/cgv"
      updated="2 novembre 2026"
    >
      <h2>1. Objet et champ d'application</h2>
      <p>
        Les présentes conditions régissent la location de mobilier, de vaisselle, de décoration et de matériel
        événementiel, ainsi que les prestations associées (livraison, installation),
        proposées par OA Événementiel (ci-après « le Prestataire ») à toute personne physique ou morale
        (ci-après « le Client »). Toute réservation implique l'acceptation des présentes conditions.
      </p>

      <h2>2. Réservation</h2>
      <p>La commande s'effectue en ligne :</p>
      <ol>
        <li>le Client ajoute le matériel souhaité à son panier depuis le catalogue ;</li>
        <li>il indique la ou les dates de son événement, ses coordonnées et l'adresse de livraison ; le total de la location et de la livraison est calculé avant paiement ;</li>
        <li>il règle la totalité de la commande en ligne. Le matériel est réservé pendant 30 minutes le temps du paiement ; sans paiement dans ce délai, la commande est abandonnée sans aucun débit ;</li>
        <li>la commande est confirmée dès que le paiement est accepté. Le Client reçoit un numéro de commande et un email de confirmation. Les prestations sur mesure font l’objet d’un devis distinct.</li>
      </ol>
      <p>
        Le Client peut suivre sa commande à tout moment
        depuis la page <Link href="/suivi">Suivi de commande</Link>.
      </p>

      <h2>3. Prix</h2>
      <ul>
        <li>Les prix sont indiqués en euros, toutes taxes comprises (TVA 20 %).</li>
        <li>
          Le tarif d'un article dépend de la quantité louée (prix dégressifs par paliers) et du jour de
          l'événement : un tarif « semaine » s'applique du lundi au jeudi, un tarif « week-end » le vendredi,
          le samedi, le dimanche et les jours fériés. Pour un événement sur plusieurs jours, le tarif est
          déterminé par le premier jour.
        </li>
        <li>Certains articles ne peuvent être loués qu'à partir d'une quantité minimale, indiquée sur le catalogue.</li>
        <li>
          Les frais de livraison sont calculés à partir de la distance routière entre notre dépôt et l'adresse
          de livraison (forfait fixe + prix au kilomètre).
        </li>
        <li>
          Le montant payé est celui affiché au moment de la commande, livraison comprise. Aucune caution n'est
          demandée lors de la commande en ligne.
        </li>
      </ul>

      <h2>4. Paiement</h2>
      <ul>
        <li>
          La commande est payée en totalité au moment où elle est passée, en ligne, par les moyens proposés sur
          la page de paiement (carte bancaire notamment), via la plateforme sécurisée Stripe. Le Prestataire
          n'a jamais accès aux données de carte du Client.
        </li>
        <li>
          En cas d'annulation d'une commande par le Prestataire, le Client est intégralement remboursé sur le
          moyen de paiement utilisé.
        </li>
      </ul>

      <h2>5. Livraison, installation et reprise</h2>
      <ul>
        <li>
          Zone d'intervention : {SITE.region} (Paris, Seine-et-Marne, Yvelines, Essonne, Hauts-de-Seine,
          Seine-Saint-Denis, Val-de-Marne et Val-d'Oise). Pour une livraison hors de cette zone, le Client
          contacte le Prestataire avant de commander.
        </li>
        <li>
          La livraison et la reprise sont possibles tous les jours. Le Prestataire contacte le Client avant
          l'événement pour convenir des horaires.
        </li>
        <li>
          Le Client indique à la commande les informations utiles à l'accès (étage, ascenseur, stationnement)
          et s'assure que le lieu est accessible aux horaires convenus.
        </li>
        <li>
          L'installation, la désinstallation et le lestage des tentes de réception sont inclus dans leur prix,
          hors frais kilométriques. Pour les autres articles, la mise en place est précisée avec le Client
          avant l'événement.
        </li>
        <li>Les commandes en ligne sont livrées : le retrait sur place n'est pas proposé.</li>
      </ul>

      <h2>6. Utilisation du matériel</h2>
      <p>
        Le Client s'engage à utiliser le matériel conformément à sa destination, à ne pas le céder ni le
        sous-louer, et à le restituer dans l'état où il lui a été remis, avec ses emballages éventuels, aux
        horaires convenus. Le kit vaisselle et les nappes se rendent sales, sans nettoyage préalable.
      </p>

      <h2>7. Droit de rétractation</h2>
      <p>
        Le Client consommateur dispose de 14 jours à compter de la commande pour se rétracter, sans motif, en
        adressant une déclaration claire à <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Il peut utiliser le
        modèle suivant : « Je notifie par la présente ma rétractation du contrat portant sur la commande n° …,
        passée le …. Nom, adresse, date. »
      </p>
      <p>
        Le Prestataire rembourse les sommes versées dans les 14 jours suivant la réception de la rétractation,
        sur le moyen de paiement utilisé. Si le Client a demandé que la location commence avant la fin de ce
        délai, il reste redevable du montant correspondant à la prestation déjà fournie. Le droit de rétractation
        ne peut plus être exercé lorsque la prestation a été pleinement exécutée.
      </p>

      <h2>8. Modification et annulation</h2>
      <ul>
        <li>
          Toute demande de modification (quantités, date, adresse) est adressée à{' '}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Elle est acceptée selon les disponibilités et
          confirmée par écrit, avec l'éventuelle différence de prix.
        </li>
        <li>
          En dehors du droit de rétractation, l'annulation à l'initiative du Client est adressée par écrit à la
          même adresse. Le montant de la commande est remboursé à 100 % si l'annulation intervient plus de 30 jours
          avant l'événement, à 50 % de 30 à 8 jours avant, et n'est pas remboursé à moins de 8 jours.
        </li>
        <li>
          En cas d'annulation à l'initiative du Prestataire, le Client est intégralement remboursé, conformément
          à l'article 4.
        </li>
        <li>
          Aucune des parties n'est responsable d'un manquement causé par un cas de force majeure au sens de
          l'article 1218 du Code civil.
        </li>
      </ul>

      <h2>9. Retours et retards de restitution</h2>
      <p>
        Le matériel est contrôlé à sa reprise. Lorsqu'il n'est pas disponible à l'horaire convenu du fait du
        Client, chaque jour de retard entamé est facturé au prix d'une journée de location du matériel concerné.
      </p>

      <h2>10. Casse, perte et dommages</h2>
      <p>
        Le matériel est placé sous la responsabilité du Client entre sa livraison et sa reprise. Toute casse ou
        perte constatée est facturée au Client au coût de réparation ou de remplacement, sur justificatif.
      </p>

      <h2>11. Responsabilité et assurance</h2>
      <p>
        Le Prestataire est responsable de la bonne exécution de ses obligations. Sa responsabilité ne peut être
        engagée lorsque le dommage résulte d'une utilisation non conforme du matériel, du fait du Client ou d'un
        tiers, ou d'un cas de force majeure. Ces dispositions ne limitent pas les droits que le Client consommateur
        tient de la loi.
      </p>

      <h2>12. Réclamations et médiation</h2>
      <p>
        Toute réclamation peut être adressée à <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Conformément à
        l'article L612-1 du Code de la consommation, le Client consommateur peut recourir gratuitement à un
        médiateur de la consommation.
      </p>

      <h2>13. Données personnelles</h2>
      <p>
        Les données collectées lors de la réservation sont traitées conformément à notre{' '}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>14. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. À défaut d'accord amiable, le litige sera porté
        devant les juridictions compétentes. Pour les Clients professionnels, le tribunal de commerce de
        Versailles est seul compétent.
      </p>
    </LegalPage>
  )
}

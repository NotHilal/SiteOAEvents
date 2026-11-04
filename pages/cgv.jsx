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
        Conformément aux dispositions de l'article L. 221-18 du Code de la consommation, le Client consommateur dispose d'un
        délai de 14 jours calendaires à compter de la confirmation de la commande pour exercer son droit de rétractation sans
        avoir à justifier de motifs ni à payer de pénalités.
      </p>
      <p>
        Pour exercer ce droit, le Client adresse sa déclaration dénuée d'ambiguïté par e-mail à{' '}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a> ou par courrier postal au siège social, en utilisant le{' '}
        <Link href="/retractation">formulaire de rétractation en ligne</Link> ou le modèle figurant en annexe des présentes conditions.
      </p>
      <p>
        Le Prestataire rembourse la totalité des sommes versées dans les 14 jours suivant la réception de la demande,
        sur le moyen de paiement utilisé lors de la commande. Conformément à l'article L. 221-25 du Code de la consommation,
        si le Client a expressément demandé que la prestation commence avant la fin du délai de rétractation (par exemple
        en réservant pour un événement intervenant dans ce délai), il verse au Prestataire un montant correspondant au
        service fourni jusqu'à la communication de sa rétractation. Par ailleurs, conformément à l'article L. 221-28 12° du
        Code de la consommation, le droit de rétractation ne peut être exercé pour les prestations pleinement exécutées
        ou pour des prestations de services d'activités de loisirs devant être fournies à une date ou à une période déterminée.
      </p>

      <h2>8. Modification et annulation</h2>
      <ul>
        <li>
          Toute demande de modification (quantités, date, adresse) est adressée à{' '}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Elle est acceptée selon les disponibilités et
          confirmée par écrit, avec l'éventuelle différence de prix.
        </li>
        <li>
          En dehors de l'exercice du droit de rétractation légal, l'annulation d'une commande à l'initiative du Client
          est soumise au barème suivant : remboursement à 100 % si la demande intervient plus de 30 jours calendaires
          avant l'événement, à 50 % entre 30 et 8 jours avant, et aucun remboursement à moins de 8 jours calendaires.
        </li>
        <li>
          En cas d'annulation à l'initiative du Prestataire (hors cas de force majeure), le Client est intégralement
          remboursé sur le moyen de paiement utilisé, sans indemnité complémentaire.
        </li>
        <li>
          Aucune des parties ne pourra être tenue pour responsable d'un manquement résultant d'un cas de force majeure
          au sens de l'article 1218 du Code civil (notamment intempéries d'une intensité exceptionnelle rendant
          l'installation de tentes dangereuse conformément aux normes de sécurité).
        </li>
      </ul>

      <h2>9. Retours et retards de restitution</h2>
      <p>
        Le matériel est vérifié et compté contradictoirement lors de la reprise par nos équipes. Lorsqu'il n'est pas tenu
        à disposition à l'horaire convenu du fait du Client, chaque jour de retard entamé donne lieu à une indemnité
        d'immobilisation équivalente au tarif journalier de location du matériel concerné.
      </p>

      <h2>10. Casse, perte, vol et dégradations</h2>
      <p>
        Le matériel est placé sous l'entière garde juridique et matérielle du Client à compter de sa mise à disposition
        ou livraison et jusqu'à sa reprise effective. En cas de casse, de perte, de vol ou de détérioration constatée
        lors du contrôle de retour, les réparations ou le remplacement à neuf du matériel sont facturés au Client à prix
        coûtant, sur justificatif.
      </p>

      <h2>11. Garanties légales</h2>
      <p>
        Le Client consommateur bénéficie des garanties légales prévues par la législation française :
      </p>
      <ul>
        <li>
          <strong>Garantie légale de conformité</strong> (articles L. 217-3 et suivants du Code de la consommation) : le
          Prestataire est tenu de livrer un matériel conforme au contrat et répond des défauts de conformité existant lors
          de la délivrance.
        </li>
        <li>
          <strong>Garantie des vices cachés</strong> (articles 1641 et suivants du Code civil) : le Client peut agir si le
          matériel loué est affecté de défauts cachés le rendant impropre à l'usage auquel on le destine.
        </li>
      </ul>

      <h2>12. Responsabilité et assurance</h2>
      <p>
        Le Prestataire est couvert par une police d'assurance responsabilité civile professionnelle couvrant les dommages
        corporels et matériels imputables à ses prestations. Sa responsabilité ne saurait être engagée en cas de mauvaise
        utilisation du matériel par le Client ou ses invités, de non-respect des consignes de sécurité, ou de cas de force majeure.
      </p>

      <h2>13. Réclamations et médiation de la consommation</h2>
      <p>
        Pour toute réclamation, le Client s'adresse en priorité à notre service client :{' '}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
      <p>
        Conformément aux articles L. 612-1 et suivants et R. 616-1 du Code de la consommation, en cas d'échec de la demande
        de réclamation ou en l'absence de réponse dans un délai de deux mois, le Client consommateur peut recourir gratuitement
        au médiateur de la consommation désigné par OA Événementiel :
      </p>
      <div className="legal-note">
        <strong>CNPM MÉDIATION CONSOMMATION</strong><br />
        27 avenue de la Libération, 42400 Saint-Chamond<br />
        Site internet : <a href="https://cnpm-mediation-consommation.eu" target="_blank" rel="noopener noreferrer">https://cnpm-mediation-consommation.eu</a>
      </div>
      <p>
        Le Client peut également utiliser la plateforme européenne de règlement en ligne des litiges :{' '}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>.
      </p>

      <h2>14. Données personnelles</h2>
      <p>
        Les données à caractère personnel collectées font l'objet d'un traitement sécurisé conforme au RGPD.
        Pour plus d'informations sur vos droits, consultez notre{' '}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>15. Droit applicable et litiges</h2>
      <p>
        Les présentes conditions générales sont régies par le droit français. En cas de litige non résolu amiablement,
        les tribunaux français sont seuls compétents selon les règles du Code de procédure civile pour les consommateurs.
        Pour les Clients professionnels, attribution expresse de compétence est faite au Tribunal de commerce de Versailles.
      </p>

      <h2>Annexe : Formulaire type de rétractation</h2>
      <p>
        <em>(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat, ou utilisez notre <Link href="/retractation">formulaire en ligne</Link>.)</em>
      </p>
      <div className="legal-note">
        <p>À l'attention de : <strong>OA Événementiel</strong>, 8 rue de la Butte des Groux, 78570 Chanteloup-les-Vignes — e-mail : {SITE.email}</p>
        <p>Je vous notifie par la présente ma rétractation du contrat portant sur la location du matériel événementiel ci-dessous :</p>
        <ul>
          <li>Numéro de commande :</li>
          <li>Commandée le :</li>
          <li>Date(s) de l'événement prévue(s) :</li>
          <li>Nom du client :</li>
          <li>Adresse du client :</li>
          <li>Date et signature (en cas de notification sur papier) :</li>
        </ul>
      </div>
    </LegalPage>
  )
}

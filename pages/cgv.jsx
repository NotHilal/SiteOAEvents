import Link from 'next/link'
import LegalPage, { ToFill, ToValidate } from '../src/components/LegalPage.jsx'
import { SITE } from '../src/lib/site.js'

// Only rules the site actually applies are stated as fact (pricing by day
// type, TTC prices, delivery fee formula, validation then payment,
// installment plans). Every commercial policy the business hasn't defined
// yet is a visible <ToFill> marker — nothing invented.
export default function Cgv() {
  return (
    <LegalPage
      title="Conditions générales de vente"
      description="Conditions générales de vente et de location d'OA Événementiel : réservation, prix, paiement, livraison, annulation et responsabilités."
      path="/cgv"
      updated="11 octobre 2026"
    >
      <ToValidate>
        trame à compléter avec vos conditions commerciales et à faire valider par un professionnel du droit
        avant publication, en particulier les articles 7 (droit de rétractation), 8 (annulation) et 10 (dommages).
      </ToValidate>

      <h2>1. Objet et champ d'application</h2>
      <p>
        Les présentes conditions régissent la location de mobilier, de vaisselle, de décoration et de matériel
        événementiel, ainsi que les prestations associées (livraison, installation, organisation d'événements),
        proposées par OA Événementiel (ci-après « le Prestataire ») à toute personne physique ou morale
        (ci-après « le Client »). Toute réservation implique l'acceptation des présentes conditions.
      </p>

      <h2>2. Réservation</h2>
      <p>La réservation s'effectue en ligne, en plusieurs étapes :</p>
      <ol>
        <li>le Client sélectionne son matériel, la ou les dates de son événement et l'adresse de livraison ;</li>
        <li>une estimation indicative, livraison comprise, est calculée en ligne ;</li>
        <li>le Client envoie sa demande, qui reçoit un numéro de commande ;</li>
        <li>l'équipe du Prestataire vérifie la disponibilité et confirme ou refuse la demande par email ;</li>
        <li>la réservation devient ferme après <ToFill>réception du paiement intégral ou de l'acompte ? à préciser</ToFill>.</li>
      </ol>
      <p>
        La « simulation de devis » ne constitue pas une commande. Le Client peut suivre sa demande à tout moment
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
          Les montants affichés en ligne sont indicatifs ; le montant définitif est celui confirmé par le
          Prestataire. <ToFill>préciser si une caution / un dépôt de garantie est demandé, son montant et ses modalités de restitution</ToFill>
        </li>
      </ul>

      <h2>4. Paiement</h2>
      <ul>
        <li>Moyens de paiement acceptés : carte bancaire (paiement sécurisé par Stripe) et virement bancaire.</li>
        <li>
          Le paiement peut être réglé en une fois ou, selon le montant et la date de l'événement, en 2, 3 ou 4
          versements mensuels. Le dernier versement doit intervenir au plus tard 3 jours avant l'événement.
          L'échéancier applicable est indiqué au Client avant validation du paiement.
        </li>
        <li>
          En cas de paiement par carte en plusieurs fois, les versements suivants sont prélevés automatiquement
          aux dates de l'échéancier.
        </li>
        <li><ToFill>conséquences d'un défaut ou retard de paiement (pénalités, annulation de la réservation)</ToFill></li>
      </ul>

      <h2>5. Livraison, installation et reprise</h2>
      <ul>
        <li>Zone d'intervention : {SITE.region}. <ToFill>préciser les départements desservis et les conditions hors zone</ToFill></li>
        <li><ToFill>créneaux de livraison et de reprise, délai de prévenance, conditions d'accès (étage, ascenseur, stationnement)</ToFill></li>
        <li><ToFill>installation et démontage : inclus ou en option, tarifs éventuels</ToFill></li>
        <li><ToFill>retrait sur place (« click & collect ») possible ou non</ToFill></li>
      </ul>

      <h2>6. Utilisation du matériel</h2>
      <p>
        Le Client s'engage à utiliser le matériel conformément à sa destination, à ne pas le céder ni le
        sous-louer, et à le restituer dans l'état où il lui a été remis.{' '}
        <ToFill>conditions de restitution : nettoyage attendu (ex. vaisselle rincée ou non), emballages, horaires</ToFill>
      </p>

      <h2>7. Droit de rétractation</h2>
      <p><ToFill>régime applicable aux clients consommateurs</ToFill></p>
      <ToValidate>
        l'exception au droit de rétractation de l'article L221-28 du Code de la consommation pour les prestations
        fournies à une date déterminée doit être vérifiée au regard de votre activité exacte (location de matériel
        avec ou sans prestation).
      </ToValidate>

      <h2>8. Modification et annulation</h2>
      <ul>
        <li><ToFill>conditions de modification d'une réservation (quantités, date, adresse)</ToFill></li>
        <li><ToFill>barème d'annulation à l'initiative du Client selon le délai avant l'événement</ToFill></li>
        <li><ToFill>annulation à l'initiative du Prestataire et force majeure</ToFill></li>
      </ul>

      <h2>9. Retours et retards de restitution</h2>
      <p><ToFill>procédure de vérification au retour, frais en cas de retard de restitution</ToFill></p>

      <h2>10. Casse, perte et dommages</h2>
      <p>
        Le matériel est placé sous la responsabilité du Client entre sa livraison et sa reprise.{' '}
        <ToFill>modalités de facturation de la casse ou de la perte (valeur de remplacement, grille tarifaire)</ToFill>
      </p>

      <h2>11. Responsabilité et assurance</h2>
      <p><ToFill>limites de responsabilité du Prestataire, assurance responsabilité civile professionnelle (assureur, couverture)</ToFill></p>

      <h2>12. Réclamations et médiation</h2>
      <p>
        Toute réclamation peut être adressée à <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Conformément à
        l'article L612-1 du Code de la consommation, le Client consommateur peut recourir gratuitement à un
        médiateur de la consommation : <ToFill>nom, site web et adresse du médiateur auquel vous adhérez</ToFill>.
      </p>

      <h2>13. Données personnelles</h2>
      <p>
        Les données collectées lors de la réservation sont traitées conformément à notre{' '}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>14. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. À défaut d'accord amiable, le litige sera porté
        devant les juridictions compétentes. <ToFill>tribunal compétent pour les clients professionnels</ToFill>
      </p>
    </LegalPage>
  )
}

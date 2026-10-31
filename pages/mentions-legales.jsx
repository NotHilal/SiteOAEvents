import Link from 'next/link'
import LegalPage, { ToFill, ToValidate } from '../src/components/LegalPage.jsx'
import { SITE } from '../src/lib/site.js'

export default function MentionsLegales() {
  return (
    <LegalPage
      title="Mentions légales"
      description="Mentions légales du site OA Événementiel : éditeur, hébergeur, propriété intellectuelle et contact."
      path="/mentions-legales"
      updated="30 octobre 2026"
    >
      <ToValidate>
        les coordonnées téléphoniques, les informations de TVA et l’hébergement restent à compléter
        avant la mise en ligne. Les informations d’identification de la société sont issues du Kbis
        daté du 8 octobre 2026.
      </ToValidate>

      <h2>1. Éditeur du site</h2>
      <p>Le présent site est édité par :</p>
      <ul>
        <li>Dénomination sociale : <strong>OA Événementiel</strong></li>
        <li>Forme juridique : société par actions simplifiée (SAS)</li>
        <li>Capital social : 2 000 €</li>
        <li>Siège social : 8 rue de la Butte des Groux, 78570 Chanteloup-les-Vignes, France</li>
        <li>SIREN : 131 239 949</li>
        <li>Immatriculation : 131 239 949 RCS Versailles</li>
        <li>Date d’immatriculation : 8 octobre 2026</li>
        <li>N° de TVA intracommunautaire : <ToFill>numéro attribué ou régime applicable à confirmer par l’entreprise</ToFill></li>
        <li>Email : <a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
        <li>Téléphone : {SITE.phone ? <a href={`tel:${SITE.phone}`}>{SITE.phone}</a> : <ToFill>numéro professionnel</ToFill>}</li>
      </ul>

      <h2>2. Directeur de la publication</h2>
      <p>Erol OZBEN, président de la société OA Événementiel.</p>

      <h2>3. Hébergement</h2>
      <p>Le site est hébergé par :</p>
      <ul>
        <li><ToFill>dénomination de l’hébergeur retenu pour la mise en ligne</ToFill></li>
        <li><ToFill>adresse postale de l'hébergeur</ToFill></li>
        <li><ToFill>téléphone ou moyen de contact de l'hébergeur</ToFill></li>
      </ul>
      <p>
        Base de données : <ToFill>prestataire et localisation à confirmer avec l’hébergement de production</ToFill>
      </p>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        L'ensemble des éléments du site (textes, logo, identité visuelle, mise en page) est la propriété
        d'OA Événementiel ou fait l'objet d'une autorisation d'utilisation. Toute reproduction ou
        représentation, totale ou partielle, sans autorisation préalable écrite est interdite.
      </p>
      <p>
        Certaines photographies d'illustration proviennent de la banque d'images Unsplash et sont utilisées
        conformément à sa licence. <ToFill>préciser les crédits des photos de réalisations, le cas échéant</ToFill>
      </p>

      <h2>5. Données personnelles et cookies</h2>
      <p>
        Le traitement de vos données personnelles est décrit dans notre{' '}
        <Link href="/confidentialite">politique de confidentialité</Link>. Vous pouvez à tout moment
        modifier vos préférences de cookies depuis le lien « Gestion des cookies » en bas de page.
      </p>

      <h2>6. Responsabilité</h2>
      <p>
        OA Événementiel s'efforce d'assurer l'exactitude des informations publiées sur le site, sans
        pouvoir garantir l'absence d'erreur ou d'omission. Les prix et frais de livraison applicables
        à une commande de location sont présentés au client avant le paiement. Les prestations
        sur mesure font l’objet d’un devis. Consultez nos{' '}
        <Link href="/cgv">conditions générales de vente</Link>.
      </p>

      <h2>7. Contact</h2>
      <p>
        Pour toute question relative au site : <a href={`mailto:${SITE.email}`}>{SITE.email}</a> ou via
        notre <Link href="/contact">formulaire de contact</Link>.
      </p>
    </LegalPage>
  )
}

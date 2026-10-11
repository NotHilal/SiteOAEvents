import Link from 'next/link'
import LegalPage, { ToFill, ToValidate } from '../src/components/LegalPage.jsx'
import { SITE } from '../src/lib/site.js'

export default function MentionsLegales() {
  return (
    <LegalPage
      title="Mentions légales"
      description="Mentions légales du site OA Événementiel : éditeur, hébergeur, propriété intellectuelle et contact."
      path="/mentions-legales"
      updated="11 octobre 2026"
    >
      <ToValidate>
        les informations ci-dessous sont à compléter et à vérifier avant la mise en ligne
        (article 6-III de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique).
      </ToValidate>

      <h2>1. Éditeur du site</h2>
      <p>Le site <strong>{SITE.url.replace(/^https?:\/\//, '')}</strong> est édité par :</p>
      <ul>
        <li>Dénomination : OA Événementiel — <ToFill>raison sociale exacte si différente</ToFill></li>
        <li>Forme juridique : <ToFill>EI, micro-entreprise, SAS, SARL…</ToFill></li>
        <li>Capital social : <ToFill>montant, si société</ToFill></li>
        <li>Siège social : <ToFill>adresse postale complète</ToFill></li>
        <li>SIREN / SIRET : <ToFill>numéro</ToFill></li>
        <li>Immatriculation : <ToFill>RCS ou RNE, ville</ToFill></li>
        <li>N° de TVA intracommunautaire : <ToFill>numéro, ou mention « TVA non applicable, art. 293 B du CGI »</ToFill></li>
        <li>Email : <a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
        <li>Téléphone : <ToFill>numéro</ToFill></li>
      </ul>

      <h2>2. Directeur de la publication</h2>
      <p><ToFill>nom et prénom du responsable de la publication</ToFill></p>

      <h2>3. Hébergement</h2>
      <p>Le site est hébergé par :</p>
      <ul>
        <li><ToFill>nom de l'hébergeur (ex. Vercel Inc., OVHcloud…)</ToFill></li>
        <li><ToFill>adresse postale de l'hébergeur</ToFill></li>
        <li><ToFill>téléphone ou moyen de contact de l'hébergeur</ToFill></li>
      </ul>
      <p>
        Base de données : <ToFill>prestataire et localisation (ex. Turso, région UE) ou « hébergée avec le site »</ToFill>
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
        pouvoir garantir l'absence d'erreur ou d'omission. Les prix et estimations affichés en ligne sont
        indicatifs ; seul le montant confirmé par notre équipe fait foi (voir nos{' '}
        <Link href="/cgv">conditions générales de vente</Link>).
      </p>

      <h2>7. Contact</h2>
      <p>
        Pour toute question relative au site : <a href={`mailto:${SITE.email}`}>{SITE.email}</a> ou via
        notre <Link href="/contact">formulaire de contact</Link>.
      </p>
    </LegalPage>
  )
}

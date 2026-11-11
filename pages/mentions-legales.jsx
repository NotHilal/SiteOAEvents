import Link from 'next/link'
import LegalPage, { ToFill } from '../src/components/LegalPage.jsx'
import { SITE_ADDRESS } from '../src/lib/site.js'
import { SiteEmail, SitePhone } from '../src/components/SiteContact.jsx'

export default function MentionsLegales() {
  return (
    <LegalPage
      title="Mentions légales"
      description="Mentions légales du site OA Événementiel : éditeur, hébergeur, propriété intellectuelle et contact."
      path="/mentions-legales"
      updated="2 novembre 2026"
    >
      <h2>1. Éditeur du site</h2>
      <p>Le présent site est édité par :</p>
      <ul>
        <li>Dénomination sociale : <strong>OA Événementiel</strong></li>
        <li>Forme juridique : société par actions simplifiée (SAS)</li>
        <li>Capital social : 2 000 €</li>
        <li>Siège social : {SITE_ADDRESS}, France</li>
        <li>SIREN : 131 239 949</li>
        <li>Immatriculation : 131 239 949 RCS Versailles</li>
        <li>Date d’immatriculation : 8 octobre 2026</li>
        <li>N° de TVA intracommunautaire : FR60 131 239 949</li>
        <li>Email : <SiteEmail /></li>
        <li>Téléphone : <SitePhone fallback={<ToFill>numéro professionnel</ToFill>} /></li>
      </ul>

      <h2>2. Directeur de la publication</h2>
      <p>Erol OZBEN, président de la société OA Événementiel.</p>

      <h2>3. Hébergement</h2>
      <p>Le site est hébergé par :</p>
      <ul>
        <li>OVH SAS</li>
        <li>2 rue Kellermann, 59100 Roubaix, France</li>
        <li>Téléphone : +33 9 72 10 10 07</li>
      </ul>
      <p>La base de données du site est hébergée sur le même serveur, chez OVH.</p>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        L'ensemble des éléments du site (textes, logo, identité visuelle, mise en page) est la propriété
        d'OA Événementiel ou fait l'objet d'une autorisation d'utilisation. Toute reproduction ou
        représentation, totale ou partielle, sans autorisation préalable écrite est interdite.
      </p>
      <p>
        Certaines photographies d'illustration proviennent de la banque d'images Unsplash et sont utilisées
        conformément à sa licence.
      </p>

      <h2>5. Données personnelles et cookies</h2>
      <p>
        Le traitement de vos données personnelles est décrit dans notre{' '}
        <Link href="/confidentialite">politique de confidentialité</Link>.
        Pour en savoir plus sur les traceurs utilisés et paramétrer vos préférences, consultez notre{' '}
        <Link href="/cookies">politique relative aux cookies</Link> ou utilisez le lien « Gestion des cookies » en bas de page.
      </p>

      <h2>6. Médiation de la consommation</h2>
      <p>
        Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, OA Événementiel propose à ses clients
        consommateurs un dispositif de médiation de la consommation. L'entité de médiation retenue est :
      </p>
      <ul>
        <li><strong>CNPM MÉDIATION CONSOMMATION</strong></li>
        <li>Adresse postale : 27 avenue de la Libération, 42400 Saint-Chamond</li>
        <li>Site internet : <a href="https://cnpm-mediation-consommation.eu" target="_blank" rel="noopener noreferrer">https://cnpm-mediation-consommation.eu</a></li>
      </ul>
      <p>
        En cas de litige transfrontalier, le consommateur peut également recourir à la plateforme européenne de
        règlement en ligne des litiges (RLL) accessible à l'adresse suivante :{' '}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>.
      </p>

      <h2>7. Responsabilité</h2>
      <p>
        OA Événementiel s'efforce d'assurer l'exactitude des informations publiées sur le site, sans
        pouvoir garantir l'absence d'erreur ou d'omission. Les prix et frais de livraison applicables
        à une commande de location sont présentés au client avant le paiement. Les prestations
        sur mesure font l’objet d’un devis. Consultez nos{' '}
        <Link href="/cgv">conditions générales de vente</Link>.
      </p>

      <h2>8. Contact</h2>
      <p>
        Pour toute question relative au site : <SiteEmail /> ou via
        notre <Link href="/contact">formulaire de contact</Link>.
      </p>
    </LegalPage>
  )
}

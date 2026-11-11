import Link from 'next/link'
import LegalPage from '../src/components/LegalPage.jsx'
import { openCookieSettings } from '../src/lib/consent.js'
import { SiteEmail } from '../src/components/SiteContact.jsx'

export default function CookiesPage() {
  return (
    <LegalPage
      title="Politique relative aux cookies"
      description="Découvrez comment OA Événementiel utilise les cookies et traceurs, et gérez vos préférences de navigation."
      path="/cookies"
      updated="4 novembre 2026"
    >
      <h2>1. Qu'est-ce qu'un cookie ?</h2>
      <p>
        Un cookie est un petit fichier texte ou traceur déposé et stocké sur votre terminal (ordinateur, smartphone,
        tablette) lors de la consultation d'un site internet. Il permet à son émetteur d'identifier le terminal lors de
        visites ultérieures ou d'assurer des fonctionnalités techniques indispensables à la navigation.
      </p>

      <h2>2. Notre engagement de transparence</h2>
      <p>
        OA Événementiel s'engage à respecter votre vie privée et applique strictement les recommandations de la CNIL
        (Commission Nationale de l'Informatique et des Libertés) et les dispositions du RGPD.
      </p>
      <p>
        Par défaut, seuls les cookies et stockages strictement nécessaires au fonctionnement du site sont activés.
        Aucun traceur de mesure d'audience ou de publicité ciblée n'est déposé sans votre consentement préalable et explicite.
      </p>

      <h2>3. Les cookies et stockages utilisés sur ce site</h2>
      <div className="legal-table-wrap">
        <table className="legal-table">
          <thead>
            <tr>
              <th scope="col">Nom / Identifiant</th>
              <th scope="col">Émetteur</th>
              <th scope="col">Finalité</th>
              <th scope="col">Durée</th>
              <th scope="col">Consentement</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>catalogue_cart</code> (Stockage local)</td>
              <td>OA Événementiel</td>
              <td>Mémorisation des articles ajoutés à votre panier le temps de votre visite</td>
              <td>Session / Persistant local</td>
              <td>Exempté (technique indispensable)</td>
            </tr>
            <tr>
              <td><code>oa_consent</code> (Stockage local)</td>
              <td>OA Événementiel</td>
              <td>Mémorisation de vos choix d'acceptation ou de refus des cookies</td>
              <td>6 mois</td>
              <td>Exempté (obligation légale)</td>
            </tr>
            <tr>
              <td><code>oa_customer_token</code> (Cookie sécurisé)</td>
              <td>OA Événementiel</td>
              <td>Maintien sécurisé de votre session connectée dans l'espace client</td>
              <td>30 jours ou déconnexion</td>
              <td>Exempté (technique indispensable)</td>
            </tr>
            <tr>
              <td><code>__stripe_mid</code>, <code>__stripe_sid</code></td>
              <td>Stripe Inc.</td>
              <td>Sécurisation du formulaire de paiement par carte et prévention de la fraude</td>
              <td>Session à 1 an</td>
              <td>Exempté (nécessaire au paiement)</td>
            </tr>
            <tr>
              <td><code>_ga</code>, <code>_ga_*</code></td>
              <td>Google Ireland Ltd</td>
              <td>Mesure d'audience anonymisée et statistiques de fréquentation (Google Tag Manager)</td>
              <td>13 mois maximum</td>
              <td><strong>Requis</strong> (activé uniquement après votre accord)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>4. Comment modifier vos préférences ?</h2>
      <p>
        Vous pouvez à tout moment accepter, refuser ou personnaliser le dépôt des traceurs soumis à consentement en cliquant
        sur le bouton ci-dessous ou depuis le lien présent en permanence dans le pied de page du site :
      </p>
      <div className="legal-note" style={{ textAlign: 'center', padding: '20px' }}>
        <button
          type="button"
          className="cc-btn cc-btn-strong"
          onClick={openCookieSettings}
          style={{ cursor: 'pointer', padding: '10px 24px', fontSize: '1rem' }}
        >
          Ouvrir le panneau de gestion des cookies
        </button>
      </div>

      <h2>5. Paramétrage de votre navigateur</h2>
      <p>
        Vous pouvez également configurer votre logiciel de navigation pour qu'il accepte ou refuse les cookies, soit
        systématiquement, soit selon leur émetteur :
      </p>
      <ul>
        <li><strong>Google Chrome</strong> : Menu &gt; Paramètres &gt; Confidentialité et sécurité &gt; Cookies tiers.</li>
        <li><strong>Mozilla Firefox</strong> : Menu &gt; Paramètres &gt; Vie privée et sécurité &gt; Cookies et données de sites.</li>
        <li><strong>Apple Safari</strong> : Réglages &gt; Safari &gt; Avancé &gt; Bloquer tous les cookies.</li>
        <li><strong>Microsoft Edge</strong> : Paramètres &gt; Cookies et autorisations de site.</li>
      </ul>
      <p>
        <em>Note : Le blocage systématique de l'ensemble des cookies techniques peut altérer la mémorisation de votre panier
        ou l'accès à votre compte client.</em>
      </p>

      <h2>6. Pour en savoir plus</h2>
      <p>
        Pour toute information relative au traitement de vos données personnelles, veuillez consulter notre{' '}
        <Link href="/confidentialite">politique de confidentialité</Link> ou nous écrire à{' '}
        <SiteEmail />.
      </p>

      <p className="legal-see-also">
        Voir aussi : <Link href="/mentions-legales">Mentions légales</Link> · <Link href="/cgv">CGV</Link> · <Link href="/retractation">Formulaire de rétractation</Link>
      </p>
    </LegalPage>
  )
}

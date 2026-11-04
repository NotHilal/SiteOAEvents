import { useState } from 'react'
import Link from 'next/link'
import LegalPage from '../src/components/LegalPage.jsx'
import { SITE } from '../src/lib/site.js'

export default function RetractationPage() {
  const [copied, setCopied] = useState(false)

  const templateText = `À l'attention de :
OA Événementiel
8 rue de la Butte des Groux
78570 Chanteloup-les-Vignes
E-mail : ${SITE.email}

Je vous notifie par la présente ma rétractation du contrat portant sur la location du matériel événementiel ci-dessous :

- Numéro de commande : [Indiquez votre numéro de commande]
- Date de la commande : [JJ/MM/AAAA]
- Date(s) de l'événement prévue(s) : [JJ/MM/AAAA]
- Nom et prénom du client : [Votre nom et prénom]
- Adresse postale du client : [Votre adresse]
- Adresse e-mail du client : [Votre e-mail]
- Date de l'envoi de la présente notification : [JJ/MM/AAAA]
- Signature (uniquement en cas de notification sur papier) :`

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(templateText).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      })
    }
  }

  return (
    <LegalPage
      title="Droit et formulaire de rétractation"
      description="Modalités d'exercice de votre droit légal de rétractation et formulaire type conformément au Code de la consommation."
      path="/retractation"
      updated="4 novembre 2026"
    >
      <h2>1. Principe et délai de rétractation</h2>
      <p>
        Conformément aux dispositions de l'article L. 221-18 du Code de la consommation, en tant que client consommateur,
        vous bénéficiez d'un délai de <strong>14 jours calendaires</strong> pour exercer votre droit de rétractation
        d'un contrat conclu à distance, sans avoir à motiver votre décision ni à supporter de coûts autres que ceux prévus par la loi.
      </p>
      <p>
        Le délai court à compter du jour de la conclusion du contrat (c'est-à-dire de la validation du paiement de votre réservation).
      </p>

      <h2>2. Conditions et exceptions</h2>
      <p>
        Conformément à l'article L. 221-25 du Code de la consommation, si vous avez expressément demandé que la prestation
        de location commence avant la fin du délai de rétractation de 14 jours (par exemple lors d'une réservation urgente pour un événement
        ayant lieu dans les prochains jours), vous pouvez toujours exercer votre droit de rétractation tant que la prestation
        n'a pas été pleinement exécutée. Vous resterez alors redevable d'un montant proportionnel au service déjà fourni jusqu'à
        la notification de votre décision.
      </p>
      <p>
        Conformément à l'article L. 221-28 12° du Code de la consommation, le droit de rétractation ne peut plus être exercé
        dès lors que les prestations de services ou de mise à disposition ont été pleinement exécutées ou pour des prestations
        d'activités de loisirs devant être fournies à une date ou à une période déterminée.
      </p>

      <h2>3. Comment exercer votre droit de rétractation ?</h2>
      <p>
        Pour exercer votre droit de rétractation, vous devez nous notifier votre décision dénuée d'ambiguïté avant l'expiration
        du délai de 14 jours :
      </p>
      <ul>
        <li><strong>Par e-mail</strong> à l'adresse suivante : <a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
        <li>
          <strong>Par voie postale</strong> à l'adresse du siège social :<br />
          <strong>OA Événementiel</strong><br />
          8 rue de la Butte des Groux<br />
          78570 Chanteloup-les-Vignes
        </li>
      </ul>
      <p>
        Vous pouvez utiliser le formulaire type ci-dessous, bien que celui-ci ne soit pas obligatoire.
      </p>

      <h2>4. Formulaire type de rétractation</h2>
      <p>
        <em>(À compléter et renvoyer uniquement si vous souhaitez vous rétracter du contrat.)</em>
      </p>

      <div className="legal-note" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <strong>Modèle à copier ou imprimer :</strong>
          <button
            type="button"
            onClick={handleCopy}
            className="cc-btn cc-btn-strong"
            style={{ fontSize: '0.85rem', padding: '6px 14px', cursor: 'pointer' }}
          >
            {copied ? '✓ Modèle copié !' : 'Copier le modèle'}
          </button>
        </div>
        <pre style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'inherit',
          fontSize: '0.92rem',
          margin: 0,
          background: 'rgba(255, 255, 255, 0.7)',
          padding: '14px',
          borderRadius: '4px',
          border: '1px solid #ebd9a6',
          color: '#3f3b33'
        }}>
          {templateText}
        </pre>
      </div>

      <h2>5. Modalités de remboursement</h2>
      <p>
        En cas d'exercice régulier de votre droit de rétractation, OA Événementiel vous rembourse la totalité des sommes
        versées, y compris les frais de livraison, sans retard injustifié et au plus tard dans les{' '}
        <strong>14 jours calendaires</strong> à compter de la date à laquelle nous sommes informés de votre décision.
      </p>
      <p>
        Le remboursement s'effectue automatiquement sur le compte bancaire et la carte bancaire utilisés lors du paiement
        de la commande en ligne (via la plateforme Stripe), sans aucun frais pour vous.
      </p>

      <h2>6. Contact et assistance</h2>
      <p>
        Pour toute question relative à votre commande ou à son suivi, notre équipe est à votre écoute :{' '}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a> ou via la page{' '}
        <Link href="/suivi">suivi de commande</Link>.
      </p>

      <p className="legal-see-also">
        Voir aussi : <Link href="/cgv">Conditions générales de vente (CGV)</Link> · <Link href="/mentions-legales">Mentions légales</Link> · <Link href="/confidentialite">Politique de confidentialité</Link>
      </p>
    </LegalPage>
  )
}

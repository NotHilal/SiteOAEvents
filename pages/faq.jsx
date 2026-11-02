import Seo, { faqLd } from '../src/components/Seo.jsx'
import LandingPage from '../src/components/seo/LandingPage.jsx'
import Faq from '../src/components/seo/Faq.jsx'
import { FAQ_GROUPS } from '../src/lib/seo/landings.js'

const PATH = '/faq'
const NAME = 'Questions fréquentes'
const PAGE = { lead: 'Commande, tarifs, livraison, installation : les réponses aux questions les plus fréquentes sur la location de notre matériel. Une autre question ? [Écrivez-nous](/contact).' }

export default function FaqPage() {
  return (
    <>
      <Seo
        title="Questions fréquentes sur la location de matériel"
        description="Commande, tarifs, frais de livraison, installation, retour du matériel : toutes les réponses sur la location de matériel événementiel avec OA Événementiel."
        path={PATH}
        breadcrumb={[{ name: NAME, path: PATH }]}
        jsonLd={faqLd(FAQ_GROUPS.flatMap(g => g.items))}
      />
      <LandingPage page={PAGE} h1={NAME} crumbs={[{ name: NAME, path: PATH }]} cta={false}>
        {FAQ_GROUPS.map(g => <Faq key={g.h} items={g.items} title={g.h} />)}
      </LandingPage>
    </>
  )
}

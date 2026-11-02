import Seo from '../../src/components/Seo.jsx'
import LandingPage from '../../src/components/seo/LandingPage.jsx'
import HubCards from '../../src/components/seo/HubCards.jsx'
import { GUIDES } from '../../src/lib/seo/landings.js'

const PATH = '/guides'
const NAME = 'Conseils'
const PAGE = {
  lead: 'Surface de tente, nombre de tables et de chaises, rétroplanning : nos conseils pour louer le bon matériel en bonne quantité.',
  image: '/pics/tente-72m2.jpg',
  imageAlt: 'Tente de réception montée en extérieur',
}

export default function GuidesHub() {
  return (
    <>
      <Seo
        title="Conseils pour louer votre matériel de réception"
        description="Quelle taille de tente choisir ? Combien de tables et de chaises louer ? Quand réserver pour un mariage ? Nos guides pratiques pour préparer votre événement."
        path={PATH}
        image={PAGE.image}
        imageAlt={PAGE.imageAlt}
        preloadImage={PAGE.image}
        breadcrumb={[{ name: NAME, path: PATH }]}
      />
      <LandingPage page={PAGE} h1="Nos conseils pour préparer votre événement" crumbs={[{ name: NAME, path: PATH }]} cta={false}>
        <HubCards items={GUIDES.map(g => ({ href: `${PATH}/${g.slug}`, image: g.image, imageAlt: g.imageAlt, title: g.title, text: g.description }))} />
      </LandingPage>
    </>
  )
}

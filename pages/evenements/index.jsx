import Seo from '../../src/components/Seo.jsx'
import LandingPage from '../../src/components/seo/LandingPage.jsx'
import OccasionPanels from '../../src/components/seo/OccasionPanels.jsx'
import { EVENTS } from '../../src/lib/seo/landings.js'

const PATH = '/evenements'
const NAME = 'Événements'
const PAGE = {
  lead: 'Mariage, anniversaire, baptême, communion ou événement d’entreprise : découvrez le matériel à louer pour chaque occasion, livré dans toute la France.',
  image: '/pics/tables-rondes-sous-tente.jpg',
  imageAlt: 'Tables rondes dressées sous une tente de réception',
}

export default function EventsHub() {
  return (
    <>
      <Seo
        title="Location de matériel selon votre événement"
        description="Mariage, anniversaire, baptême, communion ou séminaire : le matériel à louer pour chaque occasion, livré et installé dans toute la France."
        path={PATH}
        image={PAGE.image}
        imageAlt={PAGE.imageAlt}
        preloadImage={PAGE.image}
        breadcrumb={[{ name: NAME, path: PATH }]}
      />
      <LandingPage page={PAGE} h1="Location de matériel pour tous vos événements" crumbs={[{ name: NAME, path: PATH }]}>
        <OccasionPanels items={EVENTS.map(e => ({ href: `${PATH}/${e.slug}`, image: e.image, imageAlt: e.imageAlt, title: e.name, text: e.lead }))} />
      </LandingPage>
    </>
  )
}

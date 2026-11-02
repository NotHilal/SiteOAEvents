import Seo, { PROVIDER_LD, faqLd } from '../../src/components/Seo.jsx'
import LandingPage from '../../src/components/seo/LandingPage.jsx'
import HubCards from '../../src/components/seo/HubCards.jsx'
import { SITE } from '../../src/lib/site.js'
import { ZONES } from '../../src/lib/seo/landings.js'

const PATH = '/location-materiel-evenementiel'
const NAME = 'Zones de livraison'
const PAGE = {
  lead: 'Implantée dans les Yvelines, OA Événementiel livre et installe son matériel de réception dans les huit départements d’Île-de-France.',
  image: '/pics/tente-chaises-tables.jpg',
  imageAlt: 'Tables et chaises installées sous une tente de réception',
  sections: [
    { h: 'Comment fonctionne la livraison ?', p: 'Les frais dépendent de la distance routière entre notre dépôt et votre adresse (forfait fixe + prix au kilomètre). Ajoutez vos articles au panier, indiquez votre adresse lors de la commande et le total, livraison comprise, s’affiche avant le paiement. La livraison et l’installation sont possibles 24h/24 et 7j/7.' },
    { h: 'Choisissez votre département', p: 'Chaque territoire a ses contraintes : accès en ville à Paris, grands terrains en Seine-et-Marne, événements d’entreprise dans les Hauts-de-Seine. Retrouvez nos conseils et le matériel adapté à votre secteur, ou parcourez directement le [catalogue complet](/catalogue/complet).' },
  ],
  faq: [
    { q: 'Livrez-vous en dehors de l’Île-de-France ?', a: 'Notre zone habituelle est l’Île-de-France. Pour un événement situé en dehors, [contactez-nous](/contact) afin de vérifier la faisabilité.' },
  ],
}

export default function ZonesHub() {
  return (
    <>
      <Seo
        title="Zones de livraison : location de matériel en Île-de-France"
        description="Paris, Yvelines, Hauts-de-Seine, Val-d’Oise, Essonne, Seine-Saint-Denis, Val-de-Marne, Seine-et-Marne : louez votre matériel de réception, livré et installé."
        path={PATH}
        image={PAGE.image}
        imageAlt={PAGE.imageAlt}
        preloadImage={PAGE.image}
        breadcrumb={[{ name: NAME, path: PATH }]}
        jsonLd={[
          { '@context': 'https://schema.org', '@type': 'Service', name: 'Location de matériel événementiel', serviceType: 'Location de matériel événementiel', url: `${SITE.url}${PATH}`, provider: PROVIDER_LD, areaServed: ZONES.map(z => ({ '@type': 'AdministrativeArea', name: z.name })) },
          faqLd(PAGE.faq),
        ]}
      />
      <LandingPage page={PAGE} h1="Location de matériel événementiel en Île-de-France" crumbs={[{ name: NAME, path: PATH }]}>
        <HubCards items={ZONES.map(z => ({
          href: `${PATH}/${z.slug}`,
          image: z.image,
          imageAlt: z.imageAlt,
          title: `${z.name} (${z.code})`,
          text: z.communes.slice(0, 3).join(', '),
        }))} />
      </LandingPage>
    </>
  )
}

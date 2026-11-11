// Content of the landing pages: delivery zones
// (/location-materiel-evenementiel/<slug>), occasions (/evenements/<slug>),
// guides (/guides/<slug>) and the FAQ. Each page has to stay genuinely
// useful and different from its neighbours: never duplicate a zone with only
// the place name swapped (Google treats that as doorway pages), and never
// claim past events, clients or reviews that can't be shown.
//
// Text may contain [label](/path) internal links (see RichText.jsx).

const ALL_ZONES_FAQ = {
  q: 'Comment sont calculés les frais de livraison ?',
  a: 'Ils couvrent deux allers-retours : un pour la dépose, un pour la reprise. Le calcul utilise quatre fois la distance routière aller entre notre dépôt et votre adresse, multipliée par le prix au kilomètre, avec un éventuel forfait supplémentaire. Le total s’affiche avant le paiement.',
}

export const ZONES = [
  {
    slug: 'yvelines', name: 'Yvelines', code: '78', prep: 'dans les Yvelines',
    image: '/pics/tente-table-fleurs.jpg', imageAlt: 'Table de réception dressée avec fleurs sous une tente',
    lead: 'Installée à Chanteloup-les-Vignes, OA Événementiel loue et livre son matériel de réception dans tout le département des Yvelines.',
    sections: [
      { h: 'Votre loueur local dans le 78', p: 'Les Yvelines sont notre département d’implantation. De Saint-Germain-en-Laye à Rambouillet, beaucoup de réceptions s’y organisent en extérieur, dans un jardin ou une propriété : une [tente de réception](/location/tentes) livrée, installée et lestée permet de recevoir sereinement quelle que soit la météo.' },
      { h: 'Le matériel le plus demandé pour une réception en extérieur', p: 'Pour un repas sous tente, associez des [tables rondes](/catalogue/table-ronde), des [chaises Napoléon](/catalogue/chaise-napoleon) et un [kit lumière LED](/catalogue/kit-lumiere-led). À la mi-saison, un [parasol chauffant](/catalogue/parasol-chauffant-electrique) prolonge la soirée.' },
    ],
    communes: ['Versailles', 'Saint-Germain-en-Laye', 'Poissy', 'Chanteloup-les-Vignes', 'Conflans-Sainte-Honorine', 'Sartrouville', 'Maisons-Laffitte', 'Le Vésinet', 'Chatou', 'Les Mureaux', 'Mantes-la-Jolie', 'Plaisir', 'Rambouillet'],
    featured: ['tente-de-reception', 'table-ronde', 'chaise-napoleon', 'kit-lumiere-led'],
    faq: [
      { q: 'Où est basée OA Événementiel dans les Yvelines ?', a: 'Notre siège se trouve à Chanteloup-les-Vignes (78570), et nous livrons dans tout le département.' },
      { q: 'Peut-on installer une tente dans un jardin privé ?', a: 'Oui, nos tentes sont conçues pour l’extérieur. Vérifiez simplement que votre terrain offre la surface nécessaire : de 4 × 8 m à 5 × 20 m selon le modèle.' },
    ],
  },
  {
    slug: 'paris', name: 'Paris', code: '75', prep: 'à Paris',
    image: '/pics/tables-miroir-dorees.jpg', imageAlt: 'Tables miroir dorées pour un espace lounge',
    lead: 'Salle privatisée, appartement, terrasse ou loft : louez à Paris le mobilier et la décoration de votre réception, livrés dans tous les arrondissements.',
    sections: [
      { h: 'Une livraison pensée pour la capitale', p: 'À Paris, l’accès compte autant que le matériel. Lors de votre commande, indiquez précisément l’adresse, l’étage et la présence d’un ascenseur ; pour une demande particulière, [contactez-nous](/contact) avant de réserver afin de préparer la livraison.' },
      { h: 'Du mobilier adapté aux lieux parisiens', p: 'Dans les espaces plus compacts, un coin lounge avec [banquette en velours](/catalogue/banquette) et [tables miroir dorées](/catalogue/lot-de-2-tables-miroir-dorees) habille un lieu sans l’encombrer. Pour un dîner assis, nos [tables rectangulaires](/catalogue/table-rectangulaire) forment de longues tablées dans les salles en longueur.' },
    ],
    communes: ['Le Marais (3e et 4e)', 'Saint-Germain-des-Prés (6e)', 'Champs-Élysées (8e)', 'Opéra (9e)', 'Bastille (11e)', 'Bercy (12e)', 'Montparnasse (14e)', 'Passy (16e)', 'Batignolles (17e)', 'Montmartre (18e)', 'La Villette (19e)'],
    featured: ['banquette', 'lot-de-2-tables-miroir-dorees', 'table-rectangulaire', 'chaise-napoleon'],
    faq: [
      { q: 'Livrez-vous dans tous les arrondissements de Paris ?', a: 'Oui, nous livrons dans les 20 arrondissements. Le coût de livraison s’affiche selon l’adresse, avant le paiement.' },
      { q: 'Peut-on louer une tente à Paris ?', a: 'Une tente demande une cour ou un espace extérieur assez grand (32 m² au minimum) et les autorisations du lieu. Décrivez-nous votre site via la page contact pour vérifier la faisabilité.' },
    ],
  },
  {
    slug: 'hauts-de-seine', name: 'Hauts-de-Seine', code: '92', prep: 'dans les Hauts-de-Seine',
    image: '/pics/tables-basses-marbre.jpg', imageAlt: 'Tables basses effet marbre pour un espace cocktail',
    lead: 'Cocktail d’entreprise à La Défense ou réception privée à Rueil-Malmaison : louez votre mobilier et votre décoration dans les Hauts-de-Seine.',
    sections: [
      { h: 'Pour les événements d’entreprise du 92', p: 'De La Défense à Boulogne-Billancourt, le département accueille de nombreux séminaires et soirées professionnelles. Composez un espace cocktail avec [banquettes](/location/banquettes) et [tables basses effet marbre](/catalogue/lot-de-2-tables-basses-effet-marbre), ou une salle de repas avec [tables](/location/tables) et [chaises Napoléon](/catalogue/chaise-napoleon). Voir aussi notre page [événements d’entreprise](/evenements/entreprise).' },
      { h: 'Pour vos réceptions privées', p: 'Pour un anniversaire ou un mariage à la maison, notre [vaisselle à rendre sale](/location/vaisselle-art-de-la-table) vous évite la plonge, et une [tente de 32 m²](/catalogue/tente-de-reception) s’installe sur les terrains de taille moyenne.' },
    ],
    communes: ['Boulogne-Billancourt', 'Neuilly-sur-Seine', 'Levallois-Perret', 'Courbevoie', 'Puteaux', 'Nanterre', 'Rueil-Malmaison', 'Suresnes', 'Issy-les-Moulineaux', 'Sèvres', 'Montrouge', 'Antony', 'Colombes'],
    featured: ['banquette', 'lot-de-2-tables-basses-effet-marbre', 'table-ronde', 'kit-complet-vaisselle-par-personne'],
    faq: [
      { q: 'Livrez-vous les entreprises à La Défense ?', a: 'Oui, nous livrons les particuliers comme les professionnels dans tout le 92. Pour un événement de grande ampleur, demandez un devis via la page contact.' },
    ],
  },
  {
    slug: 'val-d-oise', name: 'Val-d’Oise', code: '95', prep: 'dans le Val-d’Oise',
    image: '/pics/tente-chaises-tables.jpg', imageAlt: 'Tables et chaises installées sous une tente de réception',
    lead: 'De Cergy à Enghien-les-Bains, louez tentes, tables, chaises et décoration pour vos réceptions dans le Val-d’Oise.',
    sections: [
      { h: 'Des réceptions entre ville et campagne', p: 'Entre les communes de l’agglomération et la vallée de l’Oise, les lieux de réception du 95 sont très variés. Salle des fêtes ou jardin familial, composez votre commande article par article : [tables rectangulaires](/catalogue/table-rectangulaire) et [chaises](/location/chaises) pour la salle, [tente](/location/tentes) et [accessoires](/location/options-accessoires) pour l’extérieur.' },
      { h: 'Un décor complet pour votre mariage', p: 'Une [arche de fleurs](/location/decorations), un [rideau tressé](/catalogue/rideau-tresse-3-4-m) et une [banquette](/catalogue/banquette) suffisent à créer un coin des mariés. Consultez nos conseils pour [organiser la location de votre mariage](/guides/organiser-location-materiel-mariage).' },
    ],
    communes: ['Cergy', 'Pontoise', 'Argenteuil', 'Enghien-les-Bains', 'Montmorency', 'Ermont', 'Franconville', 'Taverny', 'Sarcelles', 'L’Isle-Adam', 'Auvers-sur-Oise'],
    featured: ['tente-de-reception', 'table-rectangulaire', 'arche-de-fleurs-ronde', 'chaise-napoleon'],
    faq: [
      { q: 'Peut-on faire livrer une salle des fêtes ?', a: 'Oui. Indiquez l’adresse de la salle lors de la commande et précisez vos contraintes d’accès ou d’horaires. Pour tout cas particulier, contactez-nous avant de réserver.' },
    ],
  },
  {
    slug: 'essonne', name: 'Essonne', code: '91', prep: 'en Essonne',
    image: '/pics/tables-rondes-sous-tente.jpg', imageAlt: 'Tables rondes dressées sous une tente de réception',
    lead: 'Du plateau de Saclay au sud de l’Essonne, louez le matériel de vos fêtes et événements professionnels, livré à l’adresse de votre choix.',
    sections: [
      { h: 'Du plateau de Saclay aux communes rurales', p: 'Le nord de l’Essonne accueille entreprises et établissements scientifiques, le sud des maisons avec jardin autour de Dourdan, d’Étampes ou de Milly-la-Forêt. Pour les séminaires, voyez notre offre [événements d’entreprise](/evenements/entreprise) ; pour une fête en plein air, choisissez une [tente de réception](/location/tentes) adaptée à votre terrain.' },
      { h: 'Bien anticiper une réception en extérieur', p: 'Le soir, prévoyez l’éclairage et le chauffage : [kit lumière LED](/catalogue/kit-lumiere-led), [parasol chauffant](/catalogue/parasol-chauffant-electrique) et [rallonges](/catalogue/rallonge-electrique) se louent avec le reste de votre commande. Plus la commande est anticipée, plus le choix de dates est large.' },
    ],
    communes: ['Évry-Courcouronnes', 'Massy', 'Palaiseau', 'Gif-sur-Yvette', 'Savigny-sur-Orge', 'Brétigny-sur-Orge', 'Corbeil-Essonnes', 'Arpajon', 'Dourdan', 'Étampes', 'Milly-la-Forêt'],
    featured: ['tente-de-reception', 'table-ronde', 'parasol-chauffant-electrique', 'kit-lumiere-led'],
    faq: [
      { q: 'Livrez-vous le sud de l’Essonne ?', a: 'Oui, nous livrons tout le département. Les frais de livraison dépendent de la distance et s’affichent avant le paiement.' },
    ],
  },
  {
    slug: 'seine-saint-denis', name: 'Seine-Saint-Denis', code: '93', prep: 'en Seine-Saint-Denis',
    image: '/pics/kit-vaisselle.jpg', imageAlt: 'Kit de vaisselle de réception avec couverts dorés',
    lead: 'Grand repas de famille, fête en salle ou événement associatif : louez tables, chaises et vaisselle en Seine-Saint-Denis, à des tarifs affichés en ligne.',
    sections: [
      { h: 'Équiper une salle pour un grand repas', p: 'Pour un repas nombreux en salle des fêtes, les tarifs de nos [tables](/location/tables) et de nos [chaises Napoléon](/catalogue/chaise-napoleon) baissent par palier selon la quantité. Calculez vos besoins avec notre guide [tables et chaises](/guides/combien-de-tables-et-chaises).' },
      { h: 'Moins de logistique le jour J', p: 'Le [kit vaisselle par personne](/catalogue/kit-complet-vaisselle-par-personne) et les [nappes professionnelles](/catalogue/nappe-professionnelle) se rendent sales : pas de plonge ni de lavage à prévoir après la fête.' },
    ],
    communes: ['Saint-Denis', 'Montreuil', 'Aubervilliers', 'Pantin', 'Bobigny', 'Noisy-le-Grand', 'Aulnay-sous-Bois', 'Drancy', 'Rosny-sous-Bois', 'Le Raincy', 'Gagny'],
    featured: ['table-rectangulaire', 'chaise-napoleon', 'kit-complet-vaisselle-par-personne', 'nappe-professionnelle'],
    faq: [
      { q: 'Y a-t-il un tarif pour les grandes quantités ?', a: 'Oui. Les tables, les chaises Napoléon et certains accessoires ont des tarifs dégressifs, indiqués sur chaque fiche produit. Pour une très grande quantité, demandez un devis.' },
    ],
  },
  {
    slug: 'val-de-marne', name: 'Val-de-Marne', code: '94', prep: 'dans le Val-de-Marne',
    image: '/pics/arche-ronde.jpg', imageAlt: 'Arche de fleurs ronde pour une cérémonie',
    lead: 'Des bords de Marne à Créteil, louez le mobilier et la décoration de votre mariage ou de votre réception dans le Val-de-Marne.',
    sections: [
      { h: 'Une cérémonie au bord de l’eau', p: 'Les bords de Marne, de Nogent à Saint-Maur-des-Fossés, offrent de beaux cadres pour une cérémonie. Une [arche de fleurs ronde](/catalogue/arche-de-fleurs-ronde) et des rangées de [chaises Napoléon](/catalogue/chaise-napoleon) suffisent à composer un décor simple et élégant. Prévoyez des [poids de lestage](/catalogue/poids-de-lestage) si le lieu est exposé au vent.' },
      { h: 'De la cérémonie au dîner', p: 'Pour le repas, composez votre salle avec nos [tables rondes](/catalogue/table-ronde) et notre [art de la table](/location/vaisselle-art-de-la-table). Notre page dédiée au [mariage](/evenements/mariage) rassemble le matériel à prévoir.' },
    ],
    communes: ['Créteil', 'Vincennes', 'Saint-Mandé', 'Nogent-sur-Marne', 'Saint-Maur-des-Fossés', 'Champigny-sur-Marne', 'Maisons-Alfort', 'Ivry-sur-Seine', 'Vitry-sur-Seine', 'Villejuif', 'Sucy-en-Brie'],
    featured: ['arche-de-fleurs-ronde', 'chaise-napoleon', 'table-ronde', 'sous-assiette-doree-transparente'],
    faq: [
      { q: 'Peut-on louer du matériel seulement pour une cérémonie ?', a: 'Oui, vous composez votre commande librement : quelques chaises (à partir de 20) et une arche suffisent. Il n’y a pas de formule imposée.' },
    ],
  },
  {
    slug: 'seine-et-marne', name: 'Seine-et-Marne', code: '77', prep: 'en Seine-et-Marne',
    image: '/pics/tente-100m2.jpg', imageAlt: 'Grande tente de réception de 100 m²',
    lead: 'Pour une réception à la campagne, autour de Meaux, Melun ou Fontainebleau, louez une grande tente et tout le mobilier, livrés en Seine-et-Marne.',
    sections: [
      { h: 'De grands espaces pour de grandes tentes', p: 'Plus vaste département d’Île-de-France, la Seine-et-Marne se prête aux réceptions en plein air. Nos tentes de [72 et 100 m²](/catalogue/tente-de-reception) accueillent les grands mariages, avec installation et lestage inclus. Notre guide vous aide à [choisir la bonne surface](/guides/quelle-taille-de-tente-de-reception).' },
      { h: 'Une livraison calculée selon la distance', p: 'Le département étant étendu, les frais de livraison varient davantage d’une commune à l’autre. Saisissez votre adresse lors de la commande pour connaître le total exact, avant tout paiement. Pour un lieu isolé, [écrivez-nous](/contact) afin de préparer l’accès.' },
    ],
    communes: ['Meaux', 'Melun', 'Fontainebleau', 'Chelles', 'Torcy', 'Lagny-sur-Marne', 'Pontault-Combault', 'Coulommiers', 'Provins', 'Nemours', 'Montereau-Fault-Yonne'],
    featured: ['tente-de-reception', 'table-ronde', 'chaise-napoleon', 'parasol-chauffant-electrique'],
    faq: [
      { q: 'Quelle tente choisir pour un mariage de 100 personnes ?', a: 'Prévoyez au moins la tente de 100 m² (5 × 20 m), et davantage d’espace si vous ajoutez une piste de danse ou un buffet. Pour une configuration plus large, contactez-nous.' },
    ],
  },
].map(zone => ({ ...zone, faq: [...zone.faq, ALL_ZONES_FAQ] }))

export const EVENTS = [
  {
    slug: 'mariage', name: 'Mariage', label: 'mariage',
    title: 'Location de matériel de mariage en Île-de-France',
    h1: 'Location de matériel pour votre mariage',
    description: 'Tente, tables, chaises Napoléon, arches de fleurs et vaisselle : louez en ligne le matériel de votre mariage en Île-de-France, livré et installé.',
    image: '/pics/coin-marie-tente.jpg', imageAlt: 'Coin des mariés avec banquette et décoration sous une tente',
    lead: 'De la cérémonie au dîner, réunissez en une seule commande tout le matériel de votre mariage, avec un total calculé en ligne, livraison comprise.',
    sections: [
      { h: 'La cérémonie', p: 'Une [arche de fleurs ronde](/catalogue/arche-de-fleurs-ronde) ou [carrée](/catalogue/arche-de-fleurs-carree), un [rideau tressé](/catalogue/rideau-tresse-3-4-m) et des rangées de [chaises Napoléon](/catalogue/chaise-napoleon) composent un décor de cérémonie laïque.' },
      { h: 'Le coin des mariés', p: 'Une [banquette en velours](/catalogue/banquette), des [tables basses](/location/decorations) et un rideau en fond créent un espace dédié, parfait pour les photos.' },
      { h: 'Le dîner', p: 'Nos [tables rondes](/catalogue/table-ronde) accueillent 8 à 10 convives. Habillez-les avec nos [nappes](/catalogue/nappe-professionnelle), nos [sous-assiettes dorées](/catalogue/sous-assiette-doree-transparente) et notre [kit vaisselle](/catalogue/kit-complet-vaisselle-par-personne), à rendre sale.' },
      { h: 'En cas de réception en extérieur', p: 'Une [tente de réception](/location/tentes) installée et lestée protège vos invités. Ajoutez un [kit lumière LED](/catalogue/kit-lumiere-led) et un [parasol chauffant](/catalogue/parasol-chauffant-electrique) pour la soirée. Suivez notre guide pour [organiser votre location étape par étape](/guides/organiser-location-materiel-mariage).' },
    ],
    featured: ['arche-de-fleurs-ronde', 'chaise-napoleon', 'table-ronde', 'banquette', 'tente-de-reception', 'sous-assiette-doree-transparente', 'kit-complet-vaisselle-par-personne', 'rideau-tresse-3-4-m'],
    faq: [
      { q: 'Quand réserver le matériel de son mariage ?', a: 'Dès que la date et le lieu sont connus, surtout pour une date en haute saison : le stock est réservé au moment du paiement, jusqu’à épuisement.' },
      { q: 'Peut-on combiner location et décoration sur mesure ?', a: 'Oui. Vous pouvez commander en ligne les articles de votre choix, ou nous demander un devis pour une scénographie complète.' },
    ],
  },
  {
    slug: 'anniversaire', name: 'Anniversaire', label: 'anniversaire',
    title: 'Location de matériel pour anniversaire en Île-de-France',
    h1: 'Location de matériel pour votre anniversaire',
    description: 'Tables, chaises, tente, éclairage LED et vaisselle à louer pour un anniversaire réussi en Île-de-France. Réservation en ligne, livraison à domicile.',
    image: '/pics/tente-tables-banquette.jpg', imageAlt: 'Tables et banquette sous une tente pour une fête',
    lead: 'Anniversaire à la maison ou en salle : louez uniquement ce qu’il vous faut et recevez-le à l’adresse de la fête.',
    sections: [
      { h: 'Recevoir à la maison', p: 'Le jardin est plus petit qu’on ne le pense quand les invités arrivent. Une [tente de 32 m²](/catalogue/tente-de-reception) abrite une trentaine de personnes en repas assis, avec des [tables rectangulaires](/catalogue/table-rectangulaire) faciles à disposer.' },
      { h: 'Créer l’ambiance', p: 'Un [kit lumière LED](/catalogue/kit-lumiere-led) pour la soirée, une [banquette](/location/banquettes) pour le coin détente et une [arche de fleurs](/location/decorations) pour les photos : quelques pièces suffisent à changer l’ambiance.' },
      { h: 'Profiter de la fête', p: 'Notre [vaisselle](/location/vaisselle-art-de-la-table) se rend sale : pas de plonge le lendemain, et le matériel est repris après l’événement.' },
    ],
    featured: ['table-rectangulaire', 'chaise-napoleon', 'kit-lumiere-led', 'banquette', 'arche-de-fleurs-carree', 'kit-complet-vaisselle-par-personne', 'tente-de-reception', 'parasol-chauffant-electrique'],
    faq: [
      { q: 'Peut-on louer pour un petit anniversaire ?', a: 'Oui. Il n’y a pas de minimum de commande global, seulement un minimum de 20 unités pour les chaises Napoléon. La plupart des autres articles se louent à l’unité.' },
    ],
  },
  {
    slug: 'bapteme-communion', name: 'Baptême & communion', label: 'baptême ou communion',
    title: 'Location de matériel pour baptême et communion en Île-de-France',
    h1: 'Location de matériel pour baptême et communion',
    description: 'Tables, chaises, nappes et vaisselle à louer pour votre baptême ou votre communion en Île-de-France. Commande en ligne, livraison à l’adresse de votre choix.',
    image: '/pics/table-ronde-rideau-tresse.jpg', imageAlt: 'Table ronde dressée devant un rideau tressé',
    lead: 'Un repas de famille soigné, sans acheter de vaisselle ni déplacer de meubles : composez votre table et faites-la livrer.',
    sections: [
      { h: 'Une table élégante en toute simplicité', p: 'Pour un repas en famille, choisissez des [tables rondes](/catalogue/table-ronde) avec des [nappes professionnelles](/catalogue/nappe-professionnelle), un [kit vaisselle](/catalogue/kit-complet-vaisselle-par-personne) et l’[option verres](/catalogue/option-verres-a-pied-et-a-eau-par-personne). Tout se commande par personne ou à l’unité.' },
      { h: 'Un décor léger', p: 'Un [rideau classique](/catalogue/rideau-classique-3-3-m) en fond de salle ou une [arche de fleurs](/location/decorations) marquent l’occasion sans alourdir l’organisation.' },
    ],
    featured: ['table-ronde', 'chaise-napoleon', 'nappe-professionnelle', 'kit-complet-vaisselle-par-personne', 'option-verres-a-pied-et-a-eau-par-personne', 'rideau-classique-3-3-m', 'sous-assiette-doree-transparente', 'arche-de-fleurs-carree'],
    faq: [
      { q: 'Faut-il rendre la vaisselle et les nappes propres ?', a: 'Non, le kit vaisselle et les nappes se rendent sales.' },
    ],
  },
  {
    slug: 'entreprise', name: 'Événement d’entreprise', label: 'événement d’entreprise',
    title: 'Location de matériel pour événement d’entreprise en Île-de-France',
    h1: 'Location de matériel pour événements d’entreprise',
    description: 'Mobilier, tentes, éclairage et art de la table à louer pour vos séminaires, cocktails et soirées d’entreprise en Île-de-France. Devis sur demande.',
    image: '/pics/tables-basses-marbre.jpg', imageAlt: 'Tables basses effet marbre pour un cocktail d’entreprise',
    lead: 'Séminaire, cocktail, inauguration ou soirée de fin d’année : équipez votre événement professionnel avec un interlocuteur unique en Île-de-France.',
    sections: [
      { h: 'Cocktails et espaces de réseautage', p: 'Un espace lounge avec [banquettes](/location/banquettes) et [tables basses](/catalogue/lot-de-2-tables-basses-effet-marbre) favorise les échanges, tandis que nos [tables rectangulaires](/catalogue/table-rectangulaire) servent de buffet ou de bar.' },
      { h: 'Séminaires et dîners de gala', p: 'Pour une plénière ou un dîner assis, nos [chaises Napoléon](/catalogue/chaise-napoleon) et [tables rondes](/catalogue/table-ronde) bénéficient de tarifs dégressifs selon la quantité. Une [tente de réception](/location/tentes) permet d’organiser l’événement dans une cour ou sur un parking privé.' },
      { h: 'Un devis pour les projets sur mesure', p: 'Pour une grande quantité ou une scénographie complète, [demandez un devis](/contact) : notre équipe vous répond rapidement.' },
    ],
    featured: ['banquette', 'lot-de-2-tables-basses-effet-marbre', 'table-rectangulaire', 'chaise-napoleon', 'table-ronde', 'tente-de-reception', 'kit-lumiere-led', 'lot-de-2-tables-miroir-dorees'],
    faq: [
      { q: 'Peut-on obtenir un devis pour une entreprise ?', a: 'Oui. Décrivez votre événement via la page contact : nous préparons un devis pour les grandes quantités ou les projets sur mesure.' },
      { q: 'L’installation peut-elle avoir lieu en dehors des heures de bureau ?', a: 'Oui : la livraison et l’installation sont possibles 24h/24 et 7j/7. Précisez vos contraintes lors de votre demande.' },
    ],
  },
]

export const GUIDES = [
  {
    slug: 'quelle-taille-de-tente-de-reception',
    title: 'Quelle taille de tente de réception pour votre événement ?',
    description: 'Combien de m² de tente prévoir selon le nombre d’invités, le repas et la piste de danse ? Notre méthode et un tableau pour choisir la bonne surface.',
    image: '/pics/tente-72m2.jpg', imageAlt: 'Tente de réception de 72 m² montée en extérieur',
    published: '2026-11-02',
    lead: 'La surface d’une tente dépend moins du nombre d’invités que de ce qu’ils y feront. Voici comment l’estimer en trois questions.',
    sections: [
      { h: '1. Partez du nombre d’invités assis', p: 'Pour un repas à table, retenez comme base environ 1 m² par personne, à ajuster selon la forme de vos tables et l’aisance souhaitée. C’est sur cette base que nos tentes de 50 m² conviennent à une cinquantaine de personnes et nos tentes de 72 m² à 70 à 80 personnes.' },
      { h: '2. Ajoutez les zones sans tables', p: 'Une piste de danse, un buffet, un bar ou un coin lounge occupent de la place en plus du repas. Listez-les avant de choisir : ajouter un buffet à un repas de 50 personnes justifie souvent de passer au format supérieur.' },
      { h: '3. Mesurez votre terrain', p: 'Relevez la longueur et la largeur réellement disponibles, sans oublier les arbres, les pentes et les accès. Une tente de 100 m² fait 5 × 20 m : elle demande un terrain long, là où celle de 72 m² fait 6 × 12 m. Prévoyez aussi de l’espace autour de la structure pour son installation.' },
    ],
    table: {
      caption: 'Nos tentes de réception et leur capacité indicative en repas assis',
      head: ['Tente', 'Dimensions', 'Capacité indicative', 'Lestage inclus'],
      rows: [
        ['32 m²', '4 × 8 m', 'Environ 30 personnes', '150 kg'],
        ['50 m²', '5 × 10 m', 'Environ 50 personnes', '200 kg'],
        ['72 m²', '6 × 12 m', '70 à 80 personnes', '250 kg'],
        ['100 m²', '5 × 20 m', 'Environ 100 personnes', '300 kg'],
      ],
    },
    after: [
      { h: 'Et si vous hésitez entre deux tailles ?', p: 'Choisissez la plus grande si votre terrain le permet : vos invités circuleront mieux et le service sera plus simple. Vous pouvez aussi [nous décrire votre projet](/contact), ou consulter directement notre [tente de réception](/catalogue/tente-de-reception). L’installation, la désinstallation et le lestage sont inclus.' },
    ],
    featured: ['tente-de-reception', 'kit-lumiere-led', 'parasol-chauffant-electrique', 'rallonge-electrique'],
    faq: [],
  },
  {
    slug: 'combien-de-tables-et-chaises',
    title: 'Combien de tables et de chaises louer pour votre réception ?',
    description: 'Calculez le nombre de tables rondes ou rectangulaires et de chaises à louer selon vos invités, avec des exemples pour 50, 100 et 150 personnes.',
    image: '/pics/tables-rondes-sous-tente.jpg', imageAlt: 'Tables rondes et chaises dressées pour une réception',
    published: '2026-11-02',
    lead: 'Un calcul simple permet d’éviter les tables trop serrées comme le matériel inutile : divisez le nombre d’invités par la capacité de vos tables, puis arrondissez au-dessus.',
    sections: [
      { h: 'La capacité de chaque table', p: 'Une [table ronde de 152 cm](/catalogue/table-ronde) accueille 8 convives, une table ronde de 180 cm environ 10, et une [table rectangulaire](/catalogue/table-rectangulaire) de 6 à 8 personnes. Pour la table d’honneur ou un service à l’assiette, comptez large afin de laisser de la place au service.' },
      { h: 'Le nombre de chaises', p: 'Prévoyez une [chaise](/catalogue/chaise-napoleon) par invité, plus quelques unités de marge. La chaise Napoléon se loue à partir de 20 unités, avec un prix qui baisse par palier selon la quantité.' },
    ],
    table: {
      caption: 'Exemples de quantités (arrondies à l’unité supérieure)',
      head: ['Invités', 'Tables rondes Ø152 cm (8 pers.)', 'Tables rondes Ø180 cm (10 pers.)', 'Tables rectangulaires (8 pers.)', 'Chaises'],
      rows: [
        ['50', '7', '5', '7', '50 + marge'],
        ['100', '13', '10', '13', '100 + marge'],
        ['150', '19', '15', '19', '150 + marge'],
      ],
    },
    after: [
      { h: 'Pensez aussi aux tables de service', p: 'Ajoutez une ou deux [tables rectangulaires](/catalogue/table-rectangulaire) pour le buffet, le gâteau ou les cadeaux. Si le repas a lieu en extérieur, vérifiez ensuite [la taille de tente nécessaire](/guides/quelle-taille-de-tente-de-reception).' },
    ],
    featured: ['table-ronde', 'table-rectangulaire', 'chaise-napoleon', 'nappe-professionnelle'],
    faq: [],
  },
  {
    slug: 'organiser-location-materiel-mariage',
    title: 'Organiser la location du matériel de votre mariage : le rétroplanning',
    description: 'Que louer pour un mariage et quand le réserver ? Notre rétroplanning et notre liste de matériel, de la cérémonie au retour du matériel.',
    image: '/pics/coin-marie-tente.jpg', imageAlt: 'Coin des mariés décoré sous une tente de réception',
    published: '2026-11-02',
    lead: 'Louer le matériel de son mariage se prépare en quelques étapes simples. Voici un rétroplanning et une liste à adapter à votre réception.',
    sections: [
      { h: 'Dès que la date et le lieu sont fixés', p: 'Vérifiez ce que le lieu fournit déjà : tables, chaises, cuisine, électricité. Estimez ensuite votre nombre d’invités et, pour une réception en extérieur, [la taille de tente nécessaire](/guides/quelle-taille-de-tente-de-reception). Sur notre site, vous pouvez vérifier les disponibilités à votre date sur chaque fiche produit.' },
      { h: 'Quelques mois avant', p: 'Choisissez votre décor : [arches de fleurs](/location/decorations), [rideaux](/catalogue/rideau-tresse-3-4-m), [banquette](/catalogue/banquette). Réservez tôt pour les articles dont le stock est limité, et surtout pour les dates de haute saison.' },
      { h: 'Quand le nombre d’invités se précise', p: 'Ajustez vos quantités à l’aide de notre guide [tables et chaises](/guides/combien-de-tables-et-chaises). Ajoutez le [kit vaisselle](/catalogue/kit-complet-vaisselle-par-personne), les [nappes](/catalogue/nappe-professionnelle) et les [verres](/catalogue/option-verres-a-pied-et-a-eau-par-personne).' },
      { h: 'La semaine du mariage', p: 'Confirmez l’accès au lieu : portail, stationnement, horaires et étage. Désignez une personne présente à la livraison et à la reprise pour que les mariés n’aient pas à s’en occuper.' },
      { h: 'Après la fête', p: 'La vaisselle et les nappes se rendent sales. Rassemblez simplement le matériel selon les consignes reçues, et notre équipe le reprend.' },
    ],
    checklist: {
      h: 'La liste du matériel à prévoir',
      items: ['Arche et chaises pour la cérémonie', 'Banquette et tables basses pour le coin des mariés', 'Tables et chaises pour le dîner', 'Nappes, vaisselle, verres et sous-assiettes', 'Tente, éclairage et chauffage en cas de réception en extérieur', 'Rallonges électriques'],
    },
    after: [
      { h: 'Tout est réuni au même endroit', p: 'Retrouvez ce matériel sur notre page [location de matériel de mariage](/evenements/mariage), ou [demandez un devis](/contact) pour une scénographie complète.' },
    ],
    featured: ['arche-de-fleurs-ronde', 'banquette', 'table-ronde', 'chaise-napoleon'],
    faq: [],
  },
]

export const FAQ_GROUPS = [
  {
    h: 'Commander',
    items: [
      { q: 'Comment louer du matériel sur le site ?', a: 'Ajoutez vos articles au panier depuis le [catalogue](/catalogue), indiquez vos dates et votre adresse de livraison, vérifiez le total puis payez en ligne par carte. Votre location est confirmée immédiatement.' },
      { q: 'Peut-on vérifier une disponibilité avant de commander ?', a: 'Oui, chaque fiche produit permet de vérifier les disponibilités pour vos dates. Le matériel est réservé pendant 30 minutes le temps du paiement.' },
      { q: 'Faut-il créer un compte ?', a: 'Un espace client permet de retrouver vos commandes, et chaque commande peut aussi être suivie depuis la page de suivi avec sa référence.' },
      { q: 'Puis-je demander un devis plutôt que de commander en ligne ?', a: 'Oui. Pour une grande quantité, une décoration complète ou un projet sur mesure, [contactez-nous](/contact) : nous préparons un devis.' },
    ],
  },
  {
    h: 'Tarifs et paiement',
    items: [
      { q: 'Les prix affichés sont-ils TTC ?', a: 'Oui, les prix affichés dans le catalogue et sur les fiches produits sont TTC. Le total de la commande, livraison comprise, est calculé avant le paiement.' },
      { q: 'Pourquoi les prix varient-ils selon le jour ?', a: 'De nombreux articles ont un tarif du lundi au jeudi et un autre du vendredi au dimanche et les jours fériés. Les deux sont affichés sur la fiche produit.' },
      { q: 'Existe-t-il des tarifs dégressifs ?', a: 'Oui. Les [tables](/location/tables), les [chaises Napoléon](/catalogue/chaise-napoleon), certaines [tentes](/location/tentes) et certains accessoires ont un prix à l’unité qui baisse selon la quantité.' },
      { q: 'Comment se déroule le paiement ?', a: 'La commande se règle en totalité en ligne, par carte bancaire, via un paiement sécurisé. Les conditions complètes figurent dans nos [conditions de vente](/cgv).' },
    ],
  },
  {
    h: 'Livraison et installation',
    items: [
      { home: true, q: 'Dans quelles zones livrez-vous ?', a: 'Nous livrons dans TOUTE la France métropolitaine. Le montant de la livraison dépend de la distance routière entre notre dépôt et votre adresse et s’affiche automatiquement avant le paiement.' },
      { home: true, q: 'Combien coûte la livraison ?', a: 'Les frais couvrent deux allers-retours pour la dépose et la reprise : quatre fois la distance routière aller multipliée par le prix au kilomètre, avec un éventuel forfait supplémentaire. Le montant exact s’affiche avant le paiement.' },
      { q: 'Quand peut-on être livré ?', a: 'La livraison et l’installation sont possibles 24h/24 et 7j/7. Notre équipe vous répond tous les jours de 9h à 20h.' },
      { home: true, q: 'Le matériel est-il installé ?', a: 'Notre équipe assure la livraison, le montage et le démontage. Pour les [tentes de réception](/location/tentes), l’installation, la désinstallation et le lestage sont inclus dans le prix de location, hors frais kilométriques.' },
    ],
  },
  {
    h: 'Le matériel',
    items: [
      { home: true, q: 'Quel matériel événementiel peut-on louer ?', a: 'Des [tentes de réception](/location/tentes), des [tables](/location/tables), des [chaises](/location/chaises), des [banquettes](/location/banquettes), de la [vaisselle](/location/vaisselle-art-de-la-table), de la [décoration](/location/decorations) et des [accessoires](/location/options-accessoires) comme l’éclairage ou le chauffage.' },
      { q: 'Doit-on nettoyer le matériel avant de le rendre ?', a: 'Le [kit vaisselle](/catalogue/kit-complet-vaisselle-par-personne) et les [nappes](/catalogue/nappe-professionnelle) se rendent sales.' },
      { q: 'Y a-t-il un minimum de commande ?', a: 'Il n’y a pas de minimum global, mais certains articles ont une quantité minimale indiquée sur leur fiche : les chaises Napoléon se louent par exemple à partir de 20 unités.' },
      { q: 'Combien de jours peut durer une location ?', a: 'Vous choisissez le ou les jours de votre événement lors de la commande. Pour une durée plus longue que celle proposée, contactez-nous.' },
    ],
  },
]

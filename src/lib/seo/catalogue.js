// Editorial SEO copy for the catalogue: one entry per category (keyed by the
// slug of its /location/<slug> URL) and per product (keyed by its
// /catalogue/<slug> URL). Facts come from the price sheet, the brochure and
// medias/catalogue/README.md — nothing here may promise more than the CGV.
// A category or product created later in the admin simply has no entry and
// falls back to generic copy built from its name.
//
// Text may contain [label](/path) internal links (see RichText.jsx).

export const CATEGORY_SEO = {
  chaises: {
    label: 'Chaises',
    h1: 'Location de chaises pour événements',
    title: 'Location de chaises Napoléon en Île-de-France',
    description: 'Louez des chaises Napoléon blanches pour votre mariage, gala ou réception en Île-de-France : tarifs dégressifs, galettes en option, livraison et installation.',
    lead: 'Des chaises Napoléon III blanches pour vos cérémonies, dîners et réceptions, livrées partout en Île-de-France.',
    sections: [
      { h: 'La chaise Napoléon, un classique des réceptions', p: 'Élégante et légère, la [chaise Napoléon](/catalogue/chaise-napoleon) s’adapte aussi bien à une cérémonie en extérieur qu’à un dîner assis. Son tarif est dégressif : plus vous en louez, plus le prix à l’unité baisse. Ajoutez une [galette d’assise](/catalogue/option-galette-de-chaise) pour plus de confort.' },
      { h: 'Combien de chaises prévoir ?', p: 'Comptez une chaise par invité, plus quelques unités de marge pour les enfants ou les invités de dernière minute. Notre guide vous aide à [calculer le nombre de tables et de chaises](/guides/combien-de-tables-et-chaises) selon votre plan de salle.' },
    ],
    faq: [
      { q: 'Quelle est la quantité minimale pour louer des chaises Napoléon ?', a: 'La location de chaises Napoléon se fait à partir de 20 unités. Le prix à l’unité diminue ensuite par palier selon la quantité.' },
      { q: 'Le prix est-il le même en semaine et le week-end ?', a: 'Non : le tarif du lundi au jeudi est plus bas que celui du vendredi au dimanche et des jours fériés. La grille complète est affichée sur la fiche du produit.' },
    ],
  },
  tables: {
    label: 'Tables',
    h1: 'Location de tables de réception',
    title: 'Location de tables rondes et rectangulaires en Île-de-France',
    description: 'Louez des tables rondes Ø152 et Ø180 cm ou des tables rectangulaires de banquet pour vos réceptions en Île-de-France. Tarifs dégressifs, livraison et installation.',
    lead: 'Tables rondes et rectangulaires de banquet pour accueillir tous vos invités, à l’intérieur comme sous une tente.',
    sections: [
      { h: 'Table ronde ou table rectangulaire ?', p: 'La [table ronde](/catalogue/table-ronde) favorise la conversation : le modèle Ø152 cm accueille 8 convives, le Ø180 cm environ 10. La [table rectangulaire](/catalogue/table-rectangulaire), pliante, reçoit 6 à 8 personnes et convient aussi aux buffets et aux longues tablées.' },
      { h: 'Habillez vos tables', p: 'Complétez votre location avec nos [nappes professionnelles](/catalogue/nappe-professionnelle), nos [sous-assiettes dorées](/catalogue/sous-assiette-doree-transparente) et le [kit complet de vaisselle](/catalogue/kit-complet-vaisselle-par-personne). Le tarif de chaque table baisse à partir de 10 puis de 20 unités.' },
    ],
    faq: [
      { q: 'Combien de personnes peut-on installer à une table ronde de 152 cm ?', a: 'Une table ronde de 152 cm de diamètre accueille 8 convives. Pour des tablées de 10 personnes environ, choisissez plutôt le modèle de 180 cm.' },
      { q: 'Les nappes sont-elles fournies avec les tables ?', a: 'Non, les nappes se louent séparément. Elles sont livrées propres et repassées, et se rendent sales.' },
    ],
  },
  tentes: {
    label: 'Tentes',
    h1: 'Location de tentes de réception',
    title: 'Location de tente de réception et barnum en Île-de-France',
    description: 'Louez une tente de réception de 32 à 100 m² en Île-de-France pour votre mariage ou événement. Installation, désinstallation et lestage inclus.',
    lead: 'Quatre tailles de tentes de réception, de 32 à 100 m², pour recevoir en extérieur quelle que soit la météo.',
    sections: [
      { h: 'Installation et lestage inclus', p: 'Chaque [tente de réception](/catalogue/tente-de-reception) est louée avec son installation, sa désinstallation et son lestage, de 150 kg pour la 32 m² à 300 kg pour la 100 m². Seuls les frais kilométriques s’ajoutent, calculés selon l’adresse de votre événement.' },
      { h: 'Quelle surface pour combien d’invités ?', p: 'La tente de 50 m² convient à une cinquantaine de personnes, celle de 72 m² à 70 à 80 personnes. Prévoyez plus grand pour une piste de danse ou un buffet : notre guide explique [comment choisir la taille de votre tente](/guides/quelle-taille-de-tente-de-reception).' },
      { h: 'Complétez votre installation', p: 'Pour les soirées fraîches ou tardives, ajoutez un [parasol chauffant](/catalogue/parasol-chauffant-electrique), un [kit lumière LED](/catalogue/kit-lumiere-led) et des [rallonges électriques](/catalogue/rallonge-electrique).' },
    ],
    faq: [
      { q: 'L’installation de la tente est-elle comprise dans le prix ?', a: 'Oui. L’installation, la désinstallation et le lestage sont inclus dans le prix de location de la tente. Seuls les frais kilométriques s’y ajoutent.' },
      { q: 'Quelles sont les dimensions des tentes disponibles ?', a: 'Quatre formats sont disponibles : 32 m² (4 × 8 m), 50 m² (5 × 10 m), 72 m² (6 × 12 m) et 100 m² (5 × 20 m).' },
    ],
  },
  banquettes: {
    label: 'Banquettes',
    h1: 'Location de banquettes pour événements',
    title: 'Location de banquettes en velours en Île-de-France',
    description: 'Louez des banquettes en velours beige ou taupe, 2 ou 3 places, pour votre coin lounge ou votre espace mariés en Île-de-France. Livraison et installation.',
    lead: 'Des banquettes en velours pour créer un coin lounge, un espace cocktail ou un coin des mariés.',
    sections: [
      { h: 'Un espace lounge ou un coin des mariés', p: 'Notre [banquette](/catalogue/banquette) existe en 2 places beige ou taupe et en 3 places beige. Associée à une [arche de fleurs](/location/decorations) et à un [lot de tables basses](/catalogue/lot-de-2-tables-basses-effet-marbre), elle compose un décor complet pour vos photos.' },
    ],
    faq: [
      { q: 'Quelles couleurs de banquettes proposez-vous ?', a: 'La banquette 2 places existe en beige et en taupe, la banquette 3 places en beige.' },
    ],
  },
  decorations: {
    label: 'Décorations',
    h1: 'Location de décoration événementielle',
    title: 'Location de décoration de mariage et d’événement en Île-de-France',
    description: 'Arches de fleurs, rideaux et tables basses à louer pour votre mariage ou réception en Île-de-France. Structures et fleurs incluses, livraison et installation.',
    lead: 'Arches fleuries, rideaux et pièces de décor pour transformer votre lieu de réception.',
    sections: [
      { h: 'Arches de fleurs', p: 'L’[arche ronde](/catalogue/arche-de-fleurs-ronde) et l’[arche carrée](/catalogue/arche-de-fleurs-carree) sont louées avec leur structure et leurs fleurs. Elles encadrent une cérémonie laïque ou servent de fond pour vos photos.' },
      { h: 'Rideaux et petit mobilier', p: 'Le [rideau classique 3 × 3 m](/catalogue/rideau-classique-3-3-m) et le [rideau tressé 3 × 4 m](/catalogue/rideau-tresse-3-4-m) sont fournis avec leur structure. Pour le salon, choisissez nos tables basses [effet marbre](/catalogue/lot-de-2-tables-basses-effet-marbre) ou [miroir dorées](/catalogue/lot-de-2-tables-miroir-dorees).' },
    ],
    faq: [
      { q: 'Les fleurs sont-elles incluses dans la location de l’arche ?', a: 'Oui, la location de nos arches comprend la structure et les fleurs.' },
    ],
  },
  'vaisselle-art-de-la-table': {
    label: 'Vaisselle & art de la table',
    h1: 'Location de vaisselle et d’art de la table',
    title: 'Location de vaisselle et de nappes en Île-de-France',
    description: 'Kit vaisselle par personne, verres, nappes et sous-assiettes dorées à louer pour vos réceptions en Île-de-France. À rendre sale, sans plonge après l’événement.',
    lead: 'Vaisselle, verres, nappes et sous-assiettes : tout pour dresser vos tables, sans vaisselle à faire après la fête.',
    sections: [
      { h: 'À rendre sale : pas de plonge après la fête', p: 'Le [kit complet de vaisselle](/catalogue/kit-complet-vaisselle-par-personne) comprend grande et petite assiettes et couverts or ou argent. Il se rend sale, tout comme les [nappes professionnelles](/catalogue/nappe-professionnelle), livrées propres et repassées.' },
      { h: 'Dressez une table soignée', p: 'Ajoutez l’[option verres à pied et à eau](/catalogue/option-verres-a-pied-et-a-eau-par-personne) et des [sous-assiettes dorées](/catalogue/sous-assiette-doree-transparente) pour une table de fête.' },
    ],
    faq: [
      { q: 'Faut-il laver la vaisselle avant de la rendre ?', a: 'Non, le kit vaisselle et les nappes se rendent sales.' },
      { q: 'Que contient le kit complet de vaisselle ?', a: 'Une grande assiette, une petite assiette et des couverts or ou argent. Les verres à pied et à eau sont proposés en option.' },
    ],
  },
  'options-accessoires': {
    label: 'Options & accessoires',
    h1: 'Location d’accessoires pour événements',
    title: 'Location d’éclairage, chauffage et accessoires en Île-de-France',
    description: 'Parasols chauffants, kit lumière LED, rallonges et poids de lestage à louer pour compléter votre tente ou votre réception en Île-de-France.',
    lead: 'Éclairage, chauffage, rallonges et lestage : tout ce qui complète votre installation.',
    sections: [
      { h: 'Éclairage et chauffage', p: 'Le [kit lumière LED](/catalogue/kit-lumiere-led) réunit 2 barres LED pour éclairer une tente ou une salle. Le [parasol chauffant électrique](/catalogue/parasol-chauffant-electrique) prolonge les soirées en terrasse ou sous [tente de réception](/location/tentes).' },
      { h: 'Alimentation et sécurité', p: 'Nos [rallonges électriques](/catalogue/rallonge-electrique) de 5 et 10 mètres alimentent votre installation en extérieur, et nos [poids de lestage](/catalogue/poids-de-lestage) de 15 et 30 kg assurent la stabilité de vos structures.' },
    ],
    faq: [],
  },
}

// lead: meta description + first paragraph; body: the page's text section.
export const PRODUCT_SEO = {
  'chaise-napoleon': { lead: 'Chaise Napoléon III blanche élégante pour mariage, gala et réception haut de gamme, à louer dès 20 unités.', body: 'Silhouette classique et finition blanche : la chaise Napoléon s’accorde à tous les styles de décoration, en salle comme sous [tente de réception](/location/tentes). Son tarif baisse par palier selon la quantité. Pour plus de confort, ajoutez une [galette d’assise](/catalogue/option-galette-de-chaise). Besoin d’aide pour vos quantités ? Consultez notre guide pour [calculer le nombre de tables et de chaises](/guides/combien-de-tables-et-chaises).' },
  banquette: { lead: 'Banquette en velours à louer, 2 places beige ou taupe et 3 places beige, pour coin lounge, salon et réception.', body: 'Installez un espace de détente pendant le cocktail ou un coin des mariés pour vos photos. Associez votre banquette à une [arche de fleurs](/location/decorations) et à un [lot de tables basses effet marbre](/catalogue/lot-de-2-tables-basses-effet-marbre) pour composer un décor complet.' },
  'arche-de-fleurs-ronde': { lead: 'Arche de fleurs ronde à louer, cercle doré orné de compositions florales, structure et fleurs incluses.', body: 'Idéale pour une cérémonie de mariage ou comme fond de photos, l’arche ronde crée un point focal dans votre décor. Elle se marie très bien avec nos [banquettes en velours](/catalogue/banquette). Découvrez aussi notre [arche carrée](/catalogue/arche-de-fleurs-carree).' },
  'arche-de-fleurs-carree': { lead: 'Arche de fleurs carrée à louer pour cérémonie laïque et fond de réception, structure et fleurs incluses.', body: 'Ses lignes droites structurent votre espace de cérémonie ou votre coin photo. Associez-la à un [rideau classique](/catalogue/rideau-classique-3-3-m) pour un décor plus enveloppant, ou comparez-la avec notre [arche ronde](/catalogue/arche-de-fleurs-ronde).' },
  'rideau-classique-3-3-m': { lead: 'Rideau classique 3 × 3 m à louer, structure incluse, pour habiller un fond de salle ou un coin des mariés.', body: 'Le rideau classique apporte de la douceur à votre lieu de réception et masque un mur peu esthétique. Il sert de fond à une [banquette](/catalogue/banquette) ou à une [arche de fleurs](/location/decorations).' },
  'rideau-tresse-3-4-m': { lead: 'Rideau tressé 3 × 4 m à louer, structure incluse, décor macramé pour scénographie et cérémonie.', body: 'Ses tressages forment un décor bohème pour une cérémonie laïque ou un espace photo. Comparez-le avec notre [rideau classique 3 × 3 m](/catalogue/rideau-classique-3-3-m), ou retrouvez toute notre [décoration à louer](/location/decorations).' },
  'lot-de-2-tables-basses-effet-marbre': { lead: 'Lot de 2 tables basses effet marbre à louer pour votre espace lounge ou votre coin des mariés.', body: 'Placées devant une [banquette](/catalogue/banquette), ces tables basses accueillent verres et compositions florales pendant le cocktail. Pour un rendu plus brillant, voyez nos [tables miroir dorées](/catalogue/lot-de-2-tables-miroir-dorees).' },
  'lot-de-2-tables-miroir-dorees': { lead: 'Lot de 2 tables miroir dorées à louer pour apporter une touche lumineuse à votre espace lounge.', body: 'Leur plateau miroir et leur finition dorée reflètent la lumière de votre décor. Elles complètent une [banquette en velours](/catalogue/banquette) ou un coin des mariés. Pour un style plus sobre, voyez nos [tables effet marbre](/catalogue/lot-de-2-tables-basses-effet-marbre).' },
  'table-ronde': { lead: 'Table ronde de banquet à louer : Ø152 cm pour 8 convives ou Ø180 cm pour 10 convives environ, tarif dégressif.', body: 'Le format rond favorise les échanges entre invités et se prête à tous les plans de salle. Le prix à l’unité baisse à partir de 10 puis de 20 tables. Habillez-les avec nos [nappes professionnelles](/catalogue/nappe-professionnelle) et utilisez notre guide pour [calculer le nombre de tables](/guides/combien-de-tables-et-chaises).' },
  'table-rectangulaire': { lead: 'Table rectangulaire pliante de banquet à louer pour 6 à 8 personnes, idéale pour réceptions et buffets.', body: 'Mise bout à bout, elle forme de longues tablées conviviales ; seule, elle sert de table de buffet ou de bar. Le prix à l’unité baisse à partir de 10 puis de 20 tables. Associez-la à nos [chaises Napoléon](/catalogue/chaise-napoleon) et à nos [nappes](/catalogue/nappe-professionnelle).' },
  'tente-de-reception': { lead: 'Tente de réception à louer de 32 à 100 m², installation, désinstallation et lestage inclus, hors frais kilométriques.', body: 'Quatre formats sont disponibles : 32 m² (4 × 8 m), 50 m² (5 × 10 m), 72 m² (6 × 12 m) et 100 m² (5 × 20 m). Comptez environ 50 personnes pour la 50 m² et 70 à 80 pour la 72 m². Notre guide vous aide à [choisir la bonne taille de tente](/guides/quelle-taille-de-tente-de-reception). Complétez avec un [kit lumière LED](/catalogue/kit-lumiere-led) et un [parasol chauffant](/catalogue/parasol-chauffant-electrique).' },
  'kit-lumiere-led': { lead: 'Kit lumière LED à louer : 2 barres LED d’éclairage d’ambiance pour tente, scène et salle de réception.', body: 'Ce kit éclaire votre [tente de réception](/location/tentes) ou votre salle dès la tombée de la nuit. Pour le brancher en extérieur, ajoutez une [rallonge électrique](/catalogue/rallonge-electrique).' },
  'parasol-chauffant-electrique': { lead: 'Parasol chauffant électrique sur pied à louer pour terrasse, cocktail ou tente de réception.', body: 'Ce chauffage infrarouge prolonge vos soirées en extérieur à la mi-saison. Il se branche sur une [rallonge électrique](/catalogue/rallonge-electrique) et complète une [tente de réception](/location/tentes). Le prix à l’unité baisse à partir de 4 parasols.' },
  'rallonge-electrique': { lead: 'Rallonge électrique professionnelle à louer, 5 ou 10 mètres, pour alimenter votre installation en extérieur.', body: 'Prévoyez la longueur nécessaire entre la prise et vos appareils : [kit lumière LED](/catalogue/kit-lumiere-led), [parasol chauffant](/catalogue/parasol-chauffant-electrique) ou sonorisation.' },
  'poids-de-lestage': { lead: 'Poids de lestage à louer, 15 ou 30 kg, pour stabiliser vos structures en extérieur.', body: 'Le lestage assure la stabilité de vos structures. Nos [tentes de réception](/location/tentes) sont déjà louées avec leur lestage : ces poids servent à vos autres installations.' },
  'option-galette-de-chaise': { lead: 'Galette d’assise blanche capitonnée à louer en option pour la chaise Napoléon.', body: 'Cette galette améliore le confort des invités lors des longs repas et s’accorde au blanc de la [chaise Napoléon](/catalogue/chaise-napoleon).' },
  'kit-complet-vaisselle-par-personne': { lead: 'Kit vaisselle à louer par personne : grande et petite assiettes, couverts or ou argent. À rendre sale.', body: 'Commandez un kit par invité et dressez vos tables sans acheter de vaisselle. Après la fête, rendez-la sale : pas de plonge à prévoir. Complétez avec l’[option verres](/catalogue/option-verres-a-pied-et-a-eau-par-personne) et des [sous-assiettes dorées](/catalogue/sous-assiette-doree-transparente).' },
  'option-verres-a-pied-et-a-eau-par-personne': { lead: 'Option verres à louer par personne : un verre à pied et un verre à eau, en complément du kit vaisselle.', body: 'Cette option complète le [kit complet de vaisselle](/catalogue/kit-complet-vaisselle-par-personne) pour un dressage de table complet.' },
  'sous-assiette-doree-transparente': { lead: 'Sous-assiette dorée transparente à louer pour une table de fête élégante.', body: 'Posée sous l’assiette du [kit vaisselle](/catalogue/kit-complet-vaisselle-par-personne), elle met en valeur votre table sur une [nappe professionnelle](/catalogue/nappe-professionnelle).' },
  'nappe-professionnelle': { lead: 'Nappe professionnelle à louer, livrée propre et repassée, à rendre sale après votre réception.', body: 'Aucun nettoyage à prévoir : rendez vos nappes sales après l’événement. Elles habillent nos [tables rondes](/catalogue/table-ronde) et nos [tables rectangulaires](/catalogue/table-rectangulaire).' },
}

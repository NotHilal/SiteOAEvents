// Editable content of the public pages (Espace OA > Contenu des pages).
//
// Shared by the admin editor (forms + live preview) and the public pages.
// Each page is stored as one JSON row in site_content (`key`), shaped
// { [sectionId]: { [fieldId]: value } }. The defaults below are the site's
// original copy: a page renders exactly the same until something is edited.
//
// Field types: text, textarea, richtext (text with [lien](/chemin)), image,
// color, url, list (repeated `fields`, between `min` and `max` items).
// `required` fields fall back to their default when left empty.
// In titles, *a word between stars* is set in italics (gold) on the site.
//
// One piece of information = one field: coordinates, delivery wording and
// the FAQ are shared by every page that shows them (no copies per page).

import { SITE } from '../site.js'

const t = (id, label, def, extra = {}) => ({ id, label, type: 'text', default: def, max: 200, ...extra })
const area = (id, label, def, extra = {}) => ({ id, label, type: 'textarea', default: def, max: 2000, ...extra })
const rich = (id, label, def, extra = {}) => ({ id, label, type: 'richtext', default: def, max: 4000, ...extra })
const img = (id, label, def = '', extra = {}) => ({ id, label, type: 'image', default: def, ...extra })
const seo = (title, description) => ({
  id: 'seo',
  label: 'Référencement Google',
  description: 'Titre et résumé affichés dans les résultats de recherche (non visibles sur la page).',
  fields: [
    t('title', 'Titre de la page (≈ 60 caractères)', title, { max: 90, required: true }),
    area('description', 'Description (≈ 155 caractères)', description, { max: 300, required: true, rows: 3 }),
  ],
})

export const CMS_PAGES = [
  {
    id: 'global',
    key: 'cms_global',
    label: 'En-tête, pied de page & coordonnées',
    short: 'Commun à toutes les pages',
    path: '/',
    sections: [
      {
        id: 'header',
        label: 'En-tête',
        fields: [
          t('tagline', 'Accroche sous le logo', 'Location · Toute la France', { max: 60 }),
          t('ctaLabel', 'Bouton « Réserver » (en-tête, barre du catalogue et menu)', 'Réserver', { max: 30, required: true }),
        ],
      },
      {
        id: 'contact',
        label: 'Coordonnées',
        description: "Utilisées partout : en-tête, pied de page, Contact, À propos, pages légales et données Google. L'adresse du siège (mentions légales) se modifie dans le code.",
        fields: [
          t('phone', 'Téléphone (laisser vide pour « Sur demande »)', SITE.phone, { max: 30 }),
          t('email', 'E-mail', SITE.email, { max: 120, required: true }),
          t('hours', 'Disponibilité', 'Lun – Dim : 9h – 20h', { max: 80 }),
          t('hoursNote', 'Précision sur la disponibilité', 'Livraison et installation possibles 24h/24, 7j/7', { max: 120 }),
        ],
      },
      {
        id: 'delivery',
        label: 'Livraison',
        description: 'Repris dans le pied de page, la page Contact et l’accueil.',
        fields: [
          t('zone', 'Zone desservie (« Livraison dans … »)', 'toute la France', { max: 60, required: true }),
          rich('text', 'Texte', 'Livraison et montage dans TOUTE la France 7j/7 et 24h/24. Vos frais kilométriques sont calculés en temps réel dès la saisie de votre adresse.', { max: 600, rows: 3, required: true }),
        ],
      },
      {
        id: 'footer',
        label: 'Pied de page',
        fields: [
          area('text', 'Présentation', 'Location de matériel événementiel dans toute la France : tentes, mobilier, vaisselle et décoration, livrés et installés.', { max: 400, rows: 3 }),
          t('ctaLabel', 'Lien « devis »', 'Demander un devis →', { max: 60 }),
        ],
      },
      {
        id: 'social',
        label: 'Réseaux sociaux',
        description: 'Les icônes apparaissent dans le pied de page dès qu’une adresse est renseignée.',
        fields: [
          { id: 'facebook', label: 'Facebook', type: 'url', default: '' },
          { id: 'instagram', label: 'Instagram', type: 'url', default: '' },
          { id: 'pinterest', label: 'Pinterest', type: 'url', default: '' },
        ],
      },
    ],
  },
  {
    id: 'home',
    key: 'cms_home',
    label: 'Accueil',
    path: '/',
    sections: [
      seo('Location de matériel événementiel dans toute la France | OA Événementiel', 'Louez en ligne tentes, tables, chaises, vaisselle et décoration pour vos événements dans toute la France. Prix affichés, livraison et installation partout en France.'),
      {
        id: 'hero',
        label: 'Bandeau vidéo',
        fields: [
          t('eyebrow', 'Surtitre', 'Tentes, mobilier, vaisselle & décoration', { max: 100 }),
          t('title', 'Titre principal', 'Location de matériel événementiel dans toute la France', { required: true }),
          area('text', 'Texte', 'Louez tout pour votre réception : choisissez en ligne, réservez votre date, nous livrons et installons chez vous.', { max: 400, rows: 3 }),
          t('primaryLabel', 'Bouton 1 (catalogue)', 'Voir le catalogue', { max: 40, required: true }),
          t('secondaryLabel', 'Bouton 2 (réserver)', 'Réserver mon événement', { max: 40, required: true }),
        ],
      },
      {
        id: 'assurances',
        label: 'Engagements (sous le bandeau)',
        fields: [
          {
            id: 'items', label: 'Engagements', type: 'list', itemLabel: 'Engagement', min: 4, max: 4,
            fields: [t('title', 'Titre', '', { max: 60, required: true }), t('tag', 'Sous-titre', '', { max: 80 })],
            default: [
              { title: 'Tout pour votre décor', tag: 'Mobilier, vaisselle et éclairage' },
              { title: 'Livré et installé', tag: 'Pris en charge de A à Z' },
              { title: 'La location pour tous', tag: 'Particuliers et professionnels' },
              { title: 'Accompagnement 7j/7', tag: 'Du premier échange au jour J' },
            ],
          },
        ],
      },
      {
        id: 'categories',
        label: 'Nos catégories',
        description: 'Les tuiles elles-mêmes (photo, ordre) se gèrent dans Site > Tuiles de l’accueil.',
        fields: [
          t('title', 'Titre', 'Nos catégories', { max: 80, required: true }),
          { id: 'textColor', label: 'Couleur des titres', type: 'color', default: '#000000' },
          { id: 'hoverColor', label: 'Couleur au survol', type: 'color', default: '#b38d47' },
        ],
      },
      {
        id: 'selection',
        label: 'Notre sélection',
        fields: [
          t('title', 'Titre', 'Notre *sélection*', { max: 80, required: true }),
          t('note', 'Mention à droite', 'À louer dès maintenant', { max: 80 }),
          t('allLabel', 'Carte « tout le catalogue »', 'Voir tout le catalogue', { max: 60, required: true }),
        ],
      },
      {
        id: 'steps',
        label: 'Louez en 4 étapes',
        fields: [
          t('title', 'Titre', 'Louez en *4 étapes*', { max: 80, required: true }),
          t('buttonLabel', 'Bouton', 'Commencer ma sélection', { max: 40, required: true }),
          {
            id: 'items', label: 'Étapes', type: 'list', itemLabel: 'Étape', min: 1, max: 6,
            fields: [t('title', 'Titre', '', { max: 80, required: true }), area('text', 'Texte', '', { max: 300, rows: 2 })],
            default: [
              { title: 'Faites votre sélection', text: 'Mobilier, art de la table et décoration : ajoutez vos pièces au panier depuis le catalogue.' },
              { title: 'Indiquez la date et le lieu', text: "Au moment de commander, choisissez le ou les jours de votre événement et l'adresse de livraison." },
              { title: 'Vérifiez votre total', text: 'Le prix de la location et de la livraison est calculé immédiatement.' },
              { title: 'Payez, c’est réservé', text: 'Réglez en ligne par carte : votre location est confirmée aussitôt, suivez-la depuis votre commande.' },
            ],
          },
        ],
      },
      {
        id: 'banner',
        label: 'Bannière « Organisation sur mesure »',
        fields: [
          img('image', 'Photo de fond', 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=70&auto=format&fit=crop', { required: true }),
          t('eyebrow', 'Surtitre', 'Organisation sur mesure', { max: 60 }),
          t('title', 'Titre', 'Un mariage, un anniversaire, un séminaire ?', { required: true }),
          area('text', 'Texte', 'Au-delà de la location, notre équipe conçoit et installe la scénographie complète de votre événement.', { max: 400, rows: 3 }),
          t('buttonLabel', 'Bouton', 'Demander un devis', { max: 40, required: true }),
        ],
      },
      {
        id: 'realisations',
        label: 'Réalisations',
        description: 'Les 6 dernières réalisations s’affichent ici. Ajoutez-en depuis Site > Réalisations.',
        fields: [
          t('eyebrow', 'Surtitre', 'Réalisations', { max: 60 }),
          t('title', 'Titre', 'Quelques instants capturés', { required: true }),
          t('linkLabel', 'Lien', 'Voir toutes nos réalisations', { max: 60, required: true }),
        ],
      },
      {
        id: 'about',
        label: 'Présentation (bas de page)',
        fields: [
          t('title', 'Titre', 'Tout le matériel de votre événement, *au même endroit*', { required: true }),
          rich('text', 'Texte', 'OA Événementiel loue aux particuliers et aux professionnels le matériel de leurs réceptions : [tentes](/location/tentes), [tables](/location/tables), [chaises](/location/chaises), [banquettes](/location/banquettes), [vaisselle](/location/vaisselle-art-de-la-table) et [décoration](/location/decorations). Les prix sont affichés en ligne et le total, livraison comprise, est calculé avant le paiement.', { rows: 5 }),
          t('sign', 'Signature', 'Votre loueur dans toute la France', { max: 80 }),
          t('deliveryTitle', 'Colonne livraison : titre (le texte vient de « Livraison »)', 'Livraison & installation', { max: 60 }),
        ],
      },
      {
        id: 'faq',
        label: 'Questions fréquentes',
        description: 'Les questions affichées ici sont celles de la page Questions fréquentes cochées « Afficher aussi sur l’accueil » : une seule version de chaque question.',
        fields: [
          t('title', 'Titre', 'Vos questions sur la location', { max: 80, required: true }),
        ],
      },
      {
        id: 'cta',
        label: 'Appel à l’action final',
        fields: [
          t('title', 'Titre', 'Prêt à composer votre réception ?', { required: true }),
          area('text', 'Texte', 'Choisissez vos articles, indiquez votre date : le total, livraison comprise, est calculé en ligne.', { max: 400, rows: 2 }),
          t('primaryLabel', 'Bouton 1', 'Voir le catalogue', { max: 40, required: true }),
          t('secondaryLabel', 'Bouton 2', 'Réserver mon événement', { max: 40, required: true }),
        ],
      },
    ],
  },
  {
    id: 'about',
    key: 'cms_about',
    label: 'À propos',
    path: '/a-propos',
    sections: [
      seo("À propos d'OA Événementiel, loueur dans les Yvelines", 'Installée à Chanteloup-les-Vignes (78), OA Événementiel loue le matériel et la décoration de vos réceptions et les installe partout en France.'),
      {
        id: 'header',
        label: 'Bannière',
        fields: [
          t('title', 'Titre', 'À Propos', { max: 80, required: true }),
          img('image', 'Photo de fond', 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=75&auto=format&fit=crop', { required: true }),
        ],
      },
      {
        id: 'intro',
        label: 'Qui sommes-nous',
        fields: [
          t('eyebrow', 'Surtitre', 'Qui sommes-nous', { max: 60 }),
          t('headline', 'Titre', "Location et décoration d'événements dans toute la France", { required: true }),
          area('story', 'Présentation (une ligne vide = nouveau paragraphe)', "OA Événementiel est née en 2026 d'une conviction simple : chaque réception mérite un décor à la hauteur de ce qu'elle célèbre. Installée à Chanteloup-les-Vignes, dans les Yvelines, l'entreprise accompagne particuliers et professionnels partout en France.\n\nMariages, anniversaires, baptêmes, séminaires ou soirées d'entreprise : nous louons le mobilier, la vaisselle et la décoration de vos événements, et nous pouvons aussi les imaginer, les coordonner et les installer de A à Z. Vous composez votre sélection en ligne, nous livrons, montons et reprenons le matériel.\n\nUne question, un projet ? Écrivez-nous à contact@oa-evenementiel.fr, nous vous répondons rapidement.", { max: 6000, rows: 9, required: true }),
          img('photo', 'Photo (sinon le logo)'),
        ],
      },
      {
        id: 'counters',
        label: 'Chiffres clés',
        fields: [
          {
            id: 'items', label: 'Chiffres', type: 'list', itemLabel: 'Chiffre', min: 0, max: 4,
            fields: [t('count', 'Chiffre', '', { max: 20, required: true }), t('label', 'Légende', '', { max: 60 })],
            default: [{ count: '2026', label: 'Année de création' }, { count: '7j/7', label: 'À votre écoute' }],
          },
        ],
      },
      {
        id: 'values',
        label: 'Nos valeurs',
        fields: [
          t('eyebrow', 'Surtitre', 'Nos valeurs', { max: 60 }),
          t('title', 'Titre', 'Ce qui guide chaque projet', { required: true }),
          {
            id: 'items', label: 'Valeurs', type: 'list', itemLabel: 'Valeur', min: 4, max: 4,
            fields: [t('title', 'Titre', '', { max: 80, required: true }), area('text', 'Texte', '', { max: 400, rows: 3 })],
            default: [
              { title: 'Créativité sur-mesure', text: 'Chaque décor est pensé pour votre événement : vos couleurs, votre lieu, votre style. Nous composons avec vous une ambiance qui vous ressemble.' },
              { title: 'Logistique maîtrisée', text: 'Livraison, montage, démontage et reprise du matériel : nous organisons chaque étape pour que le jour J se déroule sans imprévu.' },
              { title: 'Écoute & Accompagnement', text: "Du premier échange à la fin de l'événement, un interlocuteur unique vous conseille et répond à vos questions." },
              { title: 'Confiance & Transparence', text: 'Des prix affichés en ligne et un total calculé avant de commander, livraison comprise : vous savez exactement ce que vous payez.' },
            ],
          },
        ],
      },
      {
        id: 'cta',
        label: 'Appel à l’action',
        fields: [
          t('title', 'Titre', 'Discutons de votre événement', { required: true }),
          area('text', 'Texte', 'Parlons de votre projet et voyons comment lui donner vie ensemble.', { max: 400, rows: 2 }),
          t('buttonLabel', 'Bouton', 'Demander un devis', { max: 40, required: true }),
        ],
      },
    ],
  },
  {
    id: 'contact',
    key: 'cms_contact',
    label: 'Contact',
    path: '/contact',
    sections: [
      seo('Contact et devis location de matériel', 'Une question ou un projet ? Contactez OA Événementiel pour vos mariages, anniversaires et événements professionnels en Île-de-France.'),
      {
        id: 'header',
        label: 'Bannière',
        fields: [
          t('title', 'Titre', 'Contactez-Nous', { max: 80, required: true }),
          img('image', 'Photo de fond', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1600&q=75&auto=format&fit=crop', { required: true }),
        ],
      },
      {
        id: 'intro',
        label: 'Présentation',
        description: 'Téléphone, e-mail et horaires : voir « En-tête, pied de page & coordonnées ».',
        fields: [
          t('eyebrow', 'Surtitre', 'Parlons de votre projet', { max: 60 }),
          t('title', 'Titre', 'Nous Sommes à Votre Écoute', { required: true }),
          area('text', 'Texte', "N'hésitez pas à nous contacter pour toute demande de renseignements ou pour démarrer la planification de votre événement.", { max: 600, rows: 3 }),
        ],
      },
      {
        id: 'form',
        label: 'Formulaire',
        fields: [
          t('title', 'Titre', 'Demande de devis', { max: 80, required: true }),
          t('lead', 'Sous-titre', 'Remplissez ce formulaire et nous vous répondrons dans les 24h.', { max: 200 }),
          t('success', 'Message après envoi', 'Message envoyé ! Nous vous répondrons très vite.', { max: 200, required: true }),
          t('buttonLabel', 'Bouton', 'Envoyer ma demande', { max: 40, required: true }),
        ],
      },
    ],
  },
  {
    id: 'realisations',
    key: 'cms_realisations',
    label: 'Nos réalisations',
    path: '/nos-realisations',
    sections: [
      seo('Nos réalisations', 'Découvrez les événements réalisés par OA Événementiel : récits, photos et vidéos.'),
      {
        id: 'header',
        label: 'Bannière',
        fields: [
          t('title', 'Titre', 'Nos réalisations', { max: 80, required: true }),
          img('image', 'Photo de fond', 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1600&q=75&auto=format&fit=crop', { required: true }),
          area('intro', 'Introduction', 'Chaque événement a son histoire. Découvrez les nôtres en images.', { max: 500, rows: 2 }),
        ],
      },
    ],
  },
  {
    id: 'faq',
    key: 'cms_faq',
    label: 'Questions fréquentes',
    path: '/faq',
    sections: [
      seo('Questions fréquentes sur la location de matériel', 'Commande, tarifs, frais de livraison, installation, retour du matériel : toutes les réponses sur la location de matériel événementiel avec OA Événementiel.'),
      {
        id: 'intro',
        label: 'Introduction',
        fields: [
          t('title', 'Titre', 'Questions fréquentes', { max: 80, required: true }),
          rich('lead', 'Texte', 'Commande, tarifs, livraison, installation : les réponses aux questions les plus fréquentes sur la location de notre matériel. Une autre question ? [Écrivez-nous](/contact).', { max: 800, rows: 3 }),
        ],
      },
      {
        id: 'groups',
        label: 'Rubriques & questions',
        fields: [
          {
            id: 'items', label: 'Rubriques', type: 'list', itemLabel: 'Rubrique', min: 1, max: 12,
            fields: [
              t('h', 'Nom de la rubrique', '', { max: 80, required: true }),
              {
                id: 'items', label: 'Questions', type: 'list', itemLabel: 'Question', min: 1, max: 20,
                fields: [
                  t('q', 'Question', '', { max: 200, required: true }),
                  rich('a', 'Réponse', '', { max: 1500, rows: 3, required: true }),
                  { id: 'home', label: 'Afficher aussi sur l’accueil', type: 'toggle', default: false },
                ],
                default: [],
              },
            ],
            default: [], // filled from src/lib/seo/landings.js (FAQ_GROUPS) in resolve.js
          },
        ],
      },
    ],
  },
]

export const CMS_PAGE_IDS = CMS_PAGES.map(p => p.id)
export const CMS_KEYS = CMS_PAGES.map(p => p.key)

export function getCmsPage(id) {
  return CMS_PAGES.find(p => p.id === id) || null
}

// Which editable page is shown at a public URL (for the live preview).
export function cmsPageForPath(path) {
  const clean = String(path || '/').split(/[?#]/)[0].replace(/\/$/, '') || '/'
  return CMS_PAGES.find(p => p.id !== 'global' && p.path === clean) || null
}

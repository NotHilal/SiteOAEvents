// Single source of truth for site-wide identity used by SEO tags, JSON-LD,
// the sitemap, robots.txt and the legal pages.
//
// SITE_URL: the production domain is https://oa-evenementiel.fr (without
// www — next.config.js redirects www there). NEXT_PUBLIC_SITE_URL overrides
// it, e.g. for a staging deployment.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://oa-evenementiel.fr').replace(/\/$/, '');

export const SITE = {
  name: 'OA Événementiel',
  url: SITE_URL,
  email: 'contact@oa-evenementiel.fr',
  // Business phone, shown as written (links use the digits only).
  // NEXT_PUBLIC_SITE_PHONE overrides it; it can also be changed in Espace OA >
  // Contenu des pages > Coordonnées.
  phone: process.env.NEXT_PUBLIC_SITE_PHONE || '+33 7 69 67 23 09',
  region: 'Toute la France',
  // Registered office (Kbis, same as /mentions-legales). Keep name, address
  // and phone strictly identical on Google Business Profile and directories.
  legalName: 'OA Événementiel',
  siren: '131239949',
  foundingDate: '2026-10-08',
  address: {
    street: '8 rue de la Butte des Groux',
    postalCode: '78570',
    city: 'Chanteloup-les-Vignes',
    department: 'Yvelines',
    country: 'FR',
  },
  // Same hours as the contact page.
  openingHours: { opens: '09:00', closes: '20:00' },
  locale: 'fr_FR',
  logo: `${SITE_URL}/icon-512.png`,
  ogImage: `${SITE_URL}/og-image.jpg`,
  // Fill with the real profile URLs to show the footer icons again.
  social: {
    facebook: '',
    instagram: '',
    pinterest: '',
  },
  description:
    "Location de matériel événementiel dans toute la France : tentes, tables, chaises, vaisselle et décoration pour mariages, anniversaires et événements d'entreprise.",
};

// Registered office on one line (legal pages, contact page, footer).
export const SITE_ADDRESS = `${SITE.address.street}, ${SITE.address.postalCode} ${SITE.address.city}`;

// Static, indexable pages — drives the sitemap together with the generated
// catalogue, zone, occasion, guide and réalisation URLs (pages/sitemap.xml.js).
// Private/technical routes (admin, suivi, api, example) are deliberately absent.
export const PUBLIC_PAGES = [
  '/',
  '/catalogue',
  '/catalogue/complet',
  '/evenements',
  '/guides',
  '/faq',
  '/a-propos',
  '/contact',
  '/mentions-legales',
  '/confidentialite',
  '/cgu',
  '/cgv',
  '/cookies',
  '/retractation',
];

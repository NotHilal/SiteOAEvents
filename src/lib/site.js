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
  // Business phone in international form (e.g. '+33612345678'). Empty until
  // the real number is known: the header's phone icon then leads to the
  // contact page instead of a tel: link.
  phone: process.env.NEXT_PUBLIC_SITE_PHONE || '',
  region: 'Île-de-France',
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
    "Location de mobilier et de décoration raffinée pour mariages, anniversaires et événements d'entreprise en Île-de-France.",
};

// Public, indexable pages — drives the sitemap. Private/technical routes
// (espace-oa, suivi, api, example) are deliberately absent.
export const PUBLIC_PAGES = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/catalogue', priority: 0.9, changefreq: 'weekly' },
  { path: '/reservation', priority: 0.8, changefreq: 'monthly' },
  { path: '/nos-realisations', priority: 0.7, changefreq: 'weekly' },
  { path: '/a-propos', priority: 0.6, changefreq: 'yearly' },
  { path: '/contact', priority: 0.7, changefreq: 'yearly' },
  { path: '/mentions-legales', priority: 0.2, changefreq: 'yearly' },
  { path: '/confidentialite', priority: 0.2, changefreq: 'yearly' },
  { path: '/cgu', priority: 0.2, changefreq: 'yearly' },
  { path: '/cgv', priority: 0.2, changefreq: 'yearly' },
];

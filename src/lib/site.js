// Single source of truth for site-wide identity used by SEO tags, JSON-LD,
// the sitemap, robots.txt and the legal pages.
//
// SITE_URL: set NEXT_PUBLIC_SITE_URL in production (e.g.
// https://www.oa-evenementiel.fr). The fallback is inferred from the contact
// email's domain and MUST be confirmed before going live.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://oa-evenementiel.fr').replace(/\/$/, '');

export const SITE = {
  name: 'OA Événementiel',
  url: SITE_URL,
  email: 'contact@oa-evenementiel.fr',
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
    "Organisation de mariages, anniversaires, événements d'entreprise et location de décoration raffinée en Île-de-France.",
};

// Public, indexable pages — drives the sitemap. Private/technical routes
// (espace-oa, suivi, api, example) are deliberately absent.
export const PUBLIC_PAGES = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/services', priority: 0.9, changefreq: 'monthly' },
  { path: '/catalogue', priority: 0.9, changefreq: 'weekly' },
  { path: '/reservation', priority: 0.8, changefreq: 'monthly' },
  { path: '/devis', priority: 0.8, changefreq: 'monthly' },
  { path: '/nos-experiences', priority: 0.7, changefreq: 'monthly' },
  { path: '/galerie', priority: 0.7, changefreq: 'monthly' },
  { path: '/a-propos', priority: 0.6, changefreq: 'yearly' },
  { path: '/contact', priority: 0.7, changefreq: 'yearly' },
  { path: '/mentions-legales', priority: 0.2, changefreq: 'yearly' },
  { path: '/confidentialite', priority: 0.2, changefreq: 'yearly' },
  { path: '/cgu', priority: 0.2, changefreq: 'yearly' },
  { path: '/cgv', priority: 0.2, changefreq: 'yearly' },
];

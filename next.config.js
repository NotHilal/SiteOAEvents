import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== 'production';
// Optional analytics host (Plausible or self-hosted), only allowed by the
// CSP when configured — see src/lib/analytics.js.
const analyticsOrigin = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
  ? new URL(process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js').origin
  : '';

// Content Security Policy — only the third parties the site really uses:
// Stripe (card payments), Webflow's CDN (template assets referenced by
// furnish.css), Unsplash (photos) and Web3Forms (contact form). Fonts,
// Bootstrap and Font Awesome are self-hosted (see _app.jsx).
// 'unsafe-inline' for styles is needed by React inline styles; scripts
// stay strict in production — which is why `npm run build` uses webpack:
// Turbopack's production output injects an inline bootstrap <script> on
// every page that this policy would block.
const csp = [
  "default-src 'self'",
  `script-src 'self' https://js.stripe.com ${analyticsOrigin}${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data: https://cdn.prod.website-files.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://cdn.prod.website-files.com https://*.stripe.com",
  `connect-src 'self' https://api.web3forms.com https://api.stripe.com https://*.stripe.com ${analyticsOrigin}${isDev ? ' ws: wss:' : ''}`,
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  // HSTS only makes sense once the site is served over HTTPS. No
  // includeSubDomains/preload until every subdomain is confirmed HTTPS.
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  poweredByHeader: false,
  // Without this, Turbopack found a stray package-lock.json in the parent
  // Projects/ folder (a sibling project's) and inferred THAT as the
  // workspace root instead of this repo — meaning it was watching every
  // other project under Projects/ too, which can make dev-server compiles
  // dramatically slower on Windows. Pin it explicitly to this repo.
  turbopack: {
    root: __dirname,
  },
  // The vendor CSS purge (scripts/postcss-vendor-purge.cjs) depends on the
  // class names used in pages/ and src/, which Turbopack's build cache can't
  // see: a warm build kept serving the old purged Font Awesome, so an icon
  // added later (e.g. fa-th-large) was missing in production. Build cold.
  experimental: {
    agentUpgrade: 'security',
    turbopackFileSystemCacheForBuild: false,
  },
  // Photos uploaded from Espace OA live in the database (files table) and
  // are served by pages/api/files at their /uploads/<path> URL. Rewrites
  // run after the public/ folder is checked, so committed files under
  // public/uploads/ (the catalogue photos) are still served as static files.
  async rewrites() {
    return [
      { source: '/uploads/:path*', destination: '/api/files/:path*' },
      // /catalogue-2, /catalogue-3… are the next pages of category tiles.
      { source: '/catalogue-:page(\\d{1,})', destination: '/catalogue?page=:page' },
    ];
  },
  async headers() {
    return [
      // Everything except saved third-party references that load their own
      // styles and media. They are isolated in same-origin iframes.
      { source: '/((?!example|catalogue-reference\\.html).*)', headers: securityHeaders },
      // Admin, API and order tracking never belong in search results.
      { source: '/espace-oa', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }, { key: 'Cache-Control', value: 'no-store' }] },
      // Long-lived caching for static icons/images in /public.
      { source: '/:file(.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico))', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    ];
  },
};

export default nextConfig;

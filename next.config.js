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
  async headers() {
    return [
      // Everything except the /example design reference (a saved copy of a
      // third-party site that loads its own assets).
      { source: '/((?!example).*)', headers: securityHeaders },
      // Admin, API and order tracking never belong in search results.
      { source: '/espace-oa', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }, { key: 'Cache-Control', value: 'no-store' }] },
      // Long-lived caching for static icons/images in /public.
      { source: '/:file(.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico))', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    ];
  },
};

export default nextConfig;

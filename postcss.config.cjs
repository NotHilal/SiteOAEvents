// PostCSS config — Tailwind for /admin only, Next's defaults (flexbugs fixes + preset-env) plus the
// vendor-only purge (scripts/postcss-vendor-purge.cjs). Plugins must be
// given as strings; the absolute path makes the local plugin resolvable
// from both webpack (build) and Turbopack (dev) — process.cwd(), not
// __dirname, which Turbopack maps to a virtual /ROOT.
const path = require('path')

module.exports = {
  plugins: [
    // Tailwind for the admin (/admin) only — see the plugin's header.
    path.join(process.cwd(), 'scripts', 'postcss-admin-tailwind.cjs'),
    'postcss-flexbugs-fixes',
    ['postcss-preset-env', {
      autoprefixer: { flexbox: 'no-2009' },
      stage: 3,
      features: { 'custom-properties': false },
    }],
    path.join(process.cwd(), 'scripts', 'postcss-vendor-purge.cjs'),
  ],
}

// PostCSS plugin: removes the Bootstrap and Font Awesome rules the site
// never uses (~50 KB of render-blocking CSS, gzipped). It ONLY touches
// those two vendor stylesheets — the site's own CSS (furnish.css,
// style.css, …) is never purged.
//
// Class names are collected from every .js/.jsx file under pages/ and src/,
// including plain strings like icon: 'fas fa-heart'. If a Bootstrap or Font
// Awesome class ever has to be built dynamically (e.g. `fa-${name}`), add it
// to SAFELIST below.
const path = require('path')
const { purgeCSSPlugin } = require('@fullhuman/postcss-purgecss')

const VENDOR = /node_modules[\\/](bootstrap|@fortawesome)[\\/]/
const root = path.resolve(__dirname, '..')
const SAFELIST = {
  standard: ['html', 'body', 'show', 'fade', 'active', 'disabled', 'visually-hidden'],
  deep: [],
  greedy: [],
}

// Globs need forward slashes: on Windows path.join() yields backslashes,
// which the glob library reads as escapes — it then matches no file at all
// and every Bootstrap / Font Awesome class gets purged.
const toGlob = (p) => p.split(path.sep).join('/')

const purge = purgeCSSPlugin({
  content: [toGlob(path.join(root, 'pages/**/*.{js,jsx}')), toGlob(path.join(root, 'src/**/*.{js,jsx}'))],
  safelist: SAFELIST,
  // Keep every @font-face / @keyframes / CSS variable — cheap, and avoids
  // breaking icon fonts or animations referenced indirectly.
  fontFace: false,
  keyframes: false,
  variables: false,
})

module.exports = () => ({
  postcssPlugin: 'vendor-purge',
  OnceExit(cssRoot, helpers) {
    const file = (cssRoot.source && cssRoot.source.input && cssRoot.source.input.file) || ''
    if (process.env.PURGE_DEBUG) console.log('[vendor-purge]', file)
    if (!VENDOR.test(file) || process.env.NO_VENDOR_PURGE) return
    // The purge result depends on pages/ and src/, not on the vendor file
    // itself — declare them as dependencies, or the bundler's cache keeps
    // serving the old purged CSS and a newly used class (e.g. a Font
    // Awesome icon added to a component) stays missing until the cache is
    // wiped. Same mechanism Tailwind uses.
    for (const dir of ['pages', 'src']) {
      helpers.result.messages.push({ type: 'dir-dependency', plugin: 'vendor-purge', dir: path.join(root, dir), glob: '**/*.{js,jsx}', parent: file })
    }
    return purge.OnceExit(cssRoot, helpers)
  },
})
module.exports.postcss = true

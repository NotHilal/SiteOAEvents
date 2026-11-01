// PostCSS plugin: runs Tailwind CSS v4 ONLY on the new admin's stylesheet
// (src/admin/styles/). The public site's CSS (src/index.css, furnish.css…)
// uses plain @import chains that Tailwind would otherwise rewrite, so it is
// left untouched — the site keeps rendering exactly as before.
const tailwind = require('@tailwindcss/postcss')

const ADMIN_CSS = /[\\/]src[\\/]admin[\\/]styles[\\/]/

module.exports = (opts = {}) => {
  const tw = tailwind(opts)
  return {
    postcssPlugin: 'admin-tailwind',
    plugins: tw.plugins.map((plugin) => ({
      postcssPlugin: `admin-${plugin.postcssPlugin}`,
      Once(root, helpers) {
        const file = (root.source && root.source.input && root.source.input.file) || ''
        if (!ADMIN_CSS.test(file)) return
        return plugin.Once(root, helpers)
      },
    })),
  }
}
module.exports.postcss = true

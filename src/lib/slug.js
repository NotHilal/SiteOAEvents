// URL slug from a product/material name: accents and symbols dropped,
// lowercase, words joined by dashes — "Banquette 2 places – Beige" →
// "banquette-2-places-beige", "Tente 32 m² (4 × 8 m)" → "tente-32-m2-4-8-m".
// Shared by the DB migration that stores materials.slug and by the
// product-page resolver's fallback for rows created since.
export function slugify(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

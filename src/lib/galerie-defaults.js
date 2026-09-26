// Shared by pages/galerie.jsx (fallback), src/lib/sqlite-db.js (seed +
// migration off the old Unsplash placeholders) and Espace OA's category
// dropdown — one source so the three can't drift apart.

export const GALERIE_CATEGORIES = [
  { key: 'mariage', label: 'Mariages' },
  { key: 'reception', label: 'Réceptions & Dîners' },
  { key: 'decor', label: 'Arches & Décors' },
  { key: 'mobilier', label: 'Mobilier & Chapiteaux' },
]

const LABELS = Object.fromEntries(GALERIE_CATEGORIES.map(c => [c.key, c.label]))

// [photo suffix in public/PHOTO-2026-09-26-<suffix>.jpg, category]
const PHOTOS = [
  ['16-18-06', 'mariage'],
  ['16-18-07_1', 'mariage'],
  ['16-24-07', 'reception'],
  ['16-24-37', 'decor'],
  ['16-24-39_3', 'reception'],
  ['16-24-41_1', 'mariage'],
  ['16-24-38_1', 'reception'],
  ['16-24-33', 'reception'],
  ['16-24-39', 'decor'],
  ['16-24-00', 'mobilier'],
  ['16-24-41', 'reception'],
  ['16-18-07', 'mariage'],
  ['16-24-06', 'decor'],
  ['16-24-12', 'reception'],
  ['16-24-36', 'decor'],
  ['16-24-38_2', 'reception'],
  ['16-24-42', 'mobilier'],
  ['16-24-35', 'reception'],
  ['16-24-38_3', 'decor'],
  ['16-24-37_3', 'mariage'],
  ['16-24-43', 'reception'],
  ['16-24-38', 'decor'],
  ['16-24-39_2', 'reception'],
  ['16-24-42_2', 'decor'],
  ['16-24-20', 'mobilier'],
  ['16-24-39_1', 'mariage'],
  ['16-24-37_2', 'decor'],
  ['16-24-27', 'reception'],
  ['16-24-41_2', 'decor'],
  ['16-24-42_1', 'mobilier'],
  ['16-24-00_1', 'mobilier'],
  ['16-24-00_2', 'mobilier'],
]

// [file name in public/pics/<name>.jpg, category] — photos from the pics/
// folder, cropped/resized (phone screenshots trimmed to the photo itself).
const PICS_PHOTOS = [
  ['coin-marie-tente', 'mariage'],
  ['arche-ronde', 'decor'],
  ['tente-table-fleurs', 'reception'],
  ['arche-carree', 'decor'],
  ['tente-tables-banquette', 'reception'],
  ['tente-50m2', 'mobilier'],
  ['kit-lumiere-led', 'decor'],
  ['table-ronde-rideau-tresse', 'reception'],
  ['tente-chaises-tables', 'reception'],
  ['sous-assiettes-dorees', 'reception'],
  ['tables-miroir-dorees', 'mobilier'],
  ['tente-parasol-chauffant', 'mobilier'],
  ['tables-rondes-sous-tente', 'reception'],
  ['banquette-3-places-beige', 'mobilier'],
  ['tente-72m2', 'reception'],
  ['tente-100m2', 'reception'],
]

export const DEFAULT_GALERIE_PHOTOS = [
  ...PHOTOS.map(([suffix, cat]) => [`/PHOTO-2026-09-26-${suffix}.jpg`, cat]),
  ...PICS_PHOTOS.map(([name, cat]) => [`/pics/${name}.jpg`, cat]),
].map(([src, cat], i) => ({ id: `photo_${i + 1}`, src, cat, label: LABELS[cat] }))

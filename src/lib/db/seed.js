import crypto from 'node:crypto'
import { slugify } from '../slug.js'
import { defaultHomeCategoryTiles } from '../catalogue-pages.js'

// Default data for a new, empty PostgreSQL database: settings and page
// content keys (added whenever missing, never overwritten) and, only when
// the catalogue is empty, the real OA Événementiel catalogue (price sheet of
// 2026-08-06 + 2026 brochure). An existing database is migrated instead with
// scripts/migrate-sqlite-to-postgres.mjs.

const REAL_CATEGORIES = [
  { id: 'cat-banquettes', name: 'BANQUETTES' },
  { id: 'cat-decorations', name: 'DÉCORATIONS' },
  { id: 'cat-tables', name: 'TABLES' },
  { id: 'cat-chaises', name: 'CHAISES' },
  { id: 'cat-tentes', name: 'TENTES' },
  { id: 'cat-options', name: 'OPTIONS & ACCESSOIRES' },
];

const CATALOGUE_TILES = [
  { name: 'BANQUETTES', label: 'Banquettes', image_url: '/catalogue/Banquettes_600x800.jpg',
    description: 'Des banquettes confortables pour créer vos espaces lounge, coins détente et cocktails.' },
  { name: 'CHAISES', label: 'Chaises', image_url: '/catalogue/Chaises_600x800.jpg',
    description: 'Des chaises élégantes pour vos cérémonies, dîners et réceptions.' },
  { name: 'DÉCORATIONS', label: 'Décorations', image_url: '/catalogue/Decorations_800x800.jpg',
    description: 'Arches fleuries, rideaux et pièces de décor pour sublimer votre lieu de réception.' },
  { name: 'OPTIONS & ACCESSOIRES', label: 'Options & accessoires', image_url: '/catalogue/Options-accessoires_600x800.jpg',
    description: 'Éclairage, chauffage, rallonges et lestage : tout ce qui complète votre installation.' },
  { name: 'TABLES', label: 'Tables', image_url: '/catalogue/Tables_1200x670.jpg',
    description: 'Tables rondes et rectangulaires pour accueillir vos invités.' },
  { name: 'TENTES', label: 'Tentes', image_url: '/catalogue/Tentes_600x800.jpg',
    description: 'Des tentes de réception de 32 à 100 m² pour vos événements en extérieur.' },
];

// Real price sheet from the business owners (2026-08-06). Each tier is
// [minQty, maxQty|null, weekdayHt, weekendHt] — TTC is always derived at
// 20% VAT (see src/lib/pricing.js), never stored. Stock (max_quantity) is
// only accurate for the 3 table types below (given by the owners) —
// everything else is a placeholder the owners need to correct via
// Espace OA > Matériel.
const REAL_MATERIALS = [
  // Banquettes
  { id: 'mat-banq-2-beige', name: 'Banquette 2 places – Beige', category: 'BANQUETTES', max_quantity: 10,
    image_url: '/uploads/materials/mat-banq-2-beige.webp',
    tiers: [[1, null, 70.00, 80.00]] },
  { id: 'mat-banq-2-taupe', name: 'Banquette 2 places – Taupe', category: 'BANQUETTES', max_quantity: 10,
    image_url: '/uploads/materials/mat-banq-2-taupe.webp',
    tiers: [[1, null, 70.00, 80.00]] },
  { id: 'mat-banq-3-beige', name: 'Banquette 3 places – Beige', category: 'BANQUETTES', max_quantity: 10,
    image_url: '/pics/banquette-3-places-beige.jpg',
    tiers: [[1, null, 130.00, 150.00]] },

  // Décorations
  { id: 'mat-deco-rideau-classique', name: 'Rideau classique 3 × 3 m', description: 'Structure incluse', category: 'DÉCORATIONS', max_quantity: 4,
    image_url: '/uploads/materials/mat-deco-rideau-classique.webp',
    tiers: [[1, null, 45.00, 50.00]] },
  { id: 'mat-deco-rideau-tresse', name: 'Rideau tressé 3 × 4 m', description: 'Structure incluse', category: 'DÉCORATIONS', max_quantity: 4,
    image_url: '/uploads/materials/mat-deco-rideau-tresse.webp',
    tiers: [[1, null, 90.00, 100.00]] },
  { id: 'mat-deco-arche-ronde', name: 'Arche de fleurs ronde', description: 'Structure + fleurs incluses', category: 'DÉCORATIONS', max_quantity: 4,
    image_url: '/uploads/materials/mat-deco-arche-ronde.webp',
    tiers: [[1, null, 35.00, 40.00]] },
  { id: 'mat-deco-arche-carree', name: 'Arche de fleurs carrée', description: 'Structure + fleurs incluses', category: 'DÉCORATIONS', max_quantity: 4,
    image_url: '/uploads/materials/mat-deco-arche-carree.webp',
    tiers: [[1, null, 35.00, 40.00]] },
  { id: 'mat-deco-tables-basses', name: 'Lot de 2 tables basses effet marbre', category: 'DÉCORATIONS', max_quantity: 6,
    image_url: '/pics/catalogue/tables-basses-marbre.jpg',
    tiers: [[1, null, 35.00, 40.00]] },

  // Tables — real stock counts from the owners
  { id: 'mat-table-rect', name: 'Table rectangulaire', category: 'TABLES', max_quantity: 80,
    image_url: '/uploads/materials/mat-table-rect.webp',
    tiers: [[1, 9, 10.20, 12.00], [10, 19, 9.18, 10.80], [20, null, 8.67, 10.20]] },
  { id: 'mat-table-ronde-152', name: 'Table ronde Ø152 cm', category: 'TABLES', max_quantity: 30,
    image_url: '/uploads/materials/mat-table-ronde-152.webp',
    tiers: [[1, 9, 11.90, 14.00], [10, 19, 10.71, 12.60], [20, null, 10.12, 11.90]] },
  { id: 'mat-table-ronde-180', name: 'Table ronde Ø180 cm', category: 'TABLES', max_quantity: 15,
    image_url: '/pics/table-ronde-180.jpg',
    tiers: [[1, 9, 15.30, 18.00], [10, 19, 13.77, 16.20], [20, null, 13.01, 15.30]] },

  // Chaises
  { id: 'mat-chaise-napoleon', name: 'Chaise Napoléon', category: 'CHAISES', max_quantity: 500, min_order_qty: 20,
    image_url: '/uploads/materials/mat-chaise-napoleon.webp',
    tiers: [[20, 79, 2.76, 3.33], [80, 150, 2.66, 3.20], [151, 250, 2.49, 3.00], [251, 500, 2.08, 2.50]] },

  // Tentes / Barnum
  { id: 'mat-tente-32', name: 'Tente de réception 32 m² (4 × 8 m)', description: 'Installation, désinstallation et lestage (150 kg) inclus. Hors frais kilométriques.', category: 'TENTES', max_quantity: 6,
    image_url: '/uploads/materials/mat-tente-32.webp',
    tiers: [[1, 2, 199.50, 210.00], [3, null, 179.55, 189.00]] },
  { id: 'mat-tente-50', name: 'Tente de réception 50 m² (5 × 10 m)', description: 'Installation, désinstallation et lestage (200 kg) inclus. Hors frais kilométriques.', category: 'TENTES', max_quantity: 6,
    image_url: '/uploads/materials/mat-tente-50.webp',
    tiers: [[1, 2, 247.00, 260.00], [3, null, 222.30, 234.00]] },
  { id: 'mat-tente-72', name: 'Tente de réception 72 m² (6 × 12 m)', description: 'Installation, désinstallation et lestage (250 kg) inclus. Hors frais kilométriques.', category: 'TENTES', max_quantity: 2,
    image_url: '/uploads/materials/mat-tente-72.webp',
    tiers: [[1, null, 332.50, 350.00]] },
  { id: 'mat-tente-100', name: 'Tente de réception 100 m² (5 × 20 m)', description: 'Installation, désinstallation et lestage (300 kg) inclus. Hors frais kilométriques.', category: 'TENTES', max_quantity: 2,
    image_url: '/uploads/materials/mat-tente-100.webp',
    tiers: [[1, null, 551.00, 580.00]] },

  // Options & Accessoires — no weekday/weekend split given, so weekday and
  // weekend HT are identical.
  { id: 'mat-opt-kit-led', name: 'Kit Lumière LED', description: '2 barres LED 6000 W', category: 'OPTIONS & ACCESSOIRES', max_quantity: 10,
    image_url: '/uploads/materials/mat-opt-kit-led.webp',
    tiers: [[1, null, 40.00, 40.00]] },
  { id: 'mat-opt-parasol', name: 'Parasol chauffant électrique', category: 'OPTIONS & ACCESSOIRES', max_quantity: 6,
    image_url: '/uploads/materials/mat-opt-parasol.webp',
    tiers: [[1, 3, 50.00, 50.00], [4, 6, 40.00, 40.00]] },
  { id: 'mat-opt-rallonge-5', name: 'Rallonge électrique 5 mètres', category: 'OPTIONS & ACCESSOIRES', max_quantity: 20,
    image_url: '/uploads/materials/mat-opt-rallonge-5.webp',
    tiers: [[1, null, 3.00, 3.00]] },
  { id: 'mat-opt-rallonge-10', name: 'Rallonge électrique 10 mètres', category: 'OPTIONS & ACCESSOIRES', max_quantity: 20,
    image_url: '/uploads/materials/mat-opt-rallonge-10.webp',
    tiers: [[1, null, 5.00, 5.00]] },
  { id: 'mat-opt-poids-15', name: 'Poids de lestage 15 kg', category: 'OPTIONS & ACCESSOIRES', max_quantity: 30,
    image_url: '/pics/tente-poids-lestage.jpg',
    tiers: [[1, null, 5.00, 5.00]] },
  { id: 'mat-opt-poids-30', name: 'Poids de lestage 30 kg', category: 'OPTIONS & ACCESSOIRES', max_quantity: 30,
    image_url: '/uploads/materials/mat-opt-poids-30.webp',
    tiers: [[1, null, 10.00, 10.00]] },
  { id: 'mat-opt-galette', name: 'Option galette de chaise', description: 'Option pour Chaise Napoléon', category: 'OPTIONS & ACCESSOIRES', max_quantity: 500,
    image_url: '/uploads/materials/mat-opt-galette.webp',
    tiers: [[1, null, 0.50, 0.50]] },
];

// Variant groupings, reviewed item by item. Only items that are the same
// product in a different size, length, weight or colour are grouped;
// different models stay separate products even when the names look alike
// (round vs square flower arch, classic vs braided curtain, the chair vs its
// cushion option). Each variant keeps its own price tiers, stock and image.
const PRODUCT_FAMILIES = [
  { id: 'prod-banquette', slug: 'banquette', name: 'Banquette', category: 'BANQUETTES',
    variants: [['mat-banq-2-beige', '2 places – Beige'], ['mat-banq-2-taupe', '2 places – Taupe'], ['mat-banq-3-beige', '3 places – Beige']] },
  { id: 'prod-table-ronde', slug: 'table-ronde', name: 'Table ronde', category: 'TABLES',
    variants: [['mat-table-ronde-152', 'Ø152 cm'], ['mat-table-ronde-180', 'Ø180 cm']] },
  { id: 'prod-tente-reception', slug: 'tente-de-reception', name: 'Tente de réception', category: 'TENTES',
    variants: [['mat-tente-32', '32 m² (4 × 8 m)'], ['mat-tente-50', '50 m² (5 × 10 m)'], ['mat-tente-72', '72 m² (6 × 12 m)'], ['mat-tente-100', '100 m² (5 × 20 m)']] },
  { id: 'prod-rallonge-electrique', slug: 'rallonge-electrique', name: 'Rallonge électrique', category: 'OPTIONS & ACCESSOIRES',
    variants: [['mat-opt-rallonge-5', '5 mètres'], ['mat-opt-rallonge-10', '10 mètres']] },
  { id: 'prod-poids-lestage', slug: 'poids-de-lestage', name: 'Poids de lestage', category: 'OPTIONS & ACCESSOIRES',
    variants: [['mat-opt-poids-15', '15 kg'], ['mat-opt-poids-30', '30 kg']] },
];

const BROCHURE_CATEGORY = { id: 'cat-vaisselle', name: 'VAISSELLE & ART DE LA TABLE' };
const BROCHURE_MATERIALS = [
  { id: 'mat-vaisselle-kit', name: 'Kit complet vaisselle (par personne)', description: 'Grande et petite assiette, couverts or ou argent. À rendre sale.', category: BROCHURE_CATEGORY.name, max_quantity: 500, ttc: 3.50, image: 'kit-vaisselle' },
  { id: 'mat-vaisselle-verres', name: 'Option verres à pied et à eau (par personne)', description: 'Les 2 verres, en complément du kit vaisselle.', category: BROCHURE_CATEGORY.name, max_quantity: 500, ttc: 0.50, image: 'verres' },
  { id: 'mat-vaisselle-sous-assiette', name: 'Sous-assiette dorée transparente', category: BROCHURE_CATEGORY.name, max_quantity: 300, ttc: 1.00, image: 'sous-assiettes-dorees' },
  { id: 'mat-vaisselle-nappe', name: 'Nappe professionnelle', description: 'Livrée propre et repassée, à rendre sale.', category: BROCHURE_CATEGORY.name, max_quantity: 80, ttc: 12.00, image: 'nappes' },
  { id: 'mat-deco-tables-miroir', name: 'Lot de 2 tables miroir dorées', category: 'DÉCORATIONS', max_quantity: 3, ttc: 30.00, image: 'catalogue/tables-miroir-dorees' },
];

const now = () => new Date().toISOString()

export async function seedDatabase(sql) {
  const t = now()
  const settings = [
    ['depot_address', process.env.DEPOT_ADDRESS || '8 rue de la Butte des Groux, 78570 Chanteloup-les-Vignes, France'],
    ['delivery_base_fee', process.env.DELIVERY_BASE_FEE || '0'],
    ['delivery_per_km', process.env.DELIVERY_PER_KM || '0.75'],
  ]
  for (const [key, value] of settings) await sql('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO NOTHING').run(key, value, t)

  const aboutPageDefault = JSON.stringify({
    headline: "Location et décoration d'événements en Île-de-France",
    story: "OA Événementiel est née en 2026 d'une conviction simple : chaque réception mérite un décor à la hauteur de ce qu'elle célèbre. Installée à Chanteloup-les-Vignes, dans les Yvelines, l'entreprise accompagne particuliers et professionnels partout en Île-de-France.\n\nMariages, anniversaires, baptêmes, séminaires ou soirées d'entreprise : nous louons le mobilier, la vaisselle et la décoration de vos événements, et nous pouvons aussi les imaginer, les coordonner et les installer de A à Z. Vous composez votre sélection en ligne, nous livrons, montons et reprenons le matériel.\n\nUne question, un projet ? Écrivez-nous à contact@oa-evenementiel.fr, nous vous répondons rapidement.",
    photoUrl: null,
    counters: [
      { count: "2026", label: "Année de création" },
      { count: "7j/7", label: "À votre écoute" },
    ],
    values: [
      { title: "Créativité sur-mesure", text: "Chaque décor est pensé pour votre événement : vos couleurs, votre lieu, votre style. Nous composons avec vous une ambiance qui vous ressemble." },
      { title: "Logistique maîtrisée", text: "Livraison, montage, démontage et reprise du matériel : nous organisons chaque étape pour que le jour J se déroule sans imprévu." },
      { title: "Écoute & Accompagnement", text: "Du premier échange à la fin de l'événement, un interlocuteur unique vous conseille et répond à vos questions." },
      { title: "Confiance & Transparence", text: "Des prix affichés en ligne et un total calculé avant de commander, livraison comprise : vous savez exactement ce que vous payez." },
    ],
  });
  const galerieDefault = JSON.stringify({
    page_header: null,
    photos: [
      { id: 'photo_1', src: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80', cat: 'mariage', label: 'Mariage' },
      { id: 'photo_2', src: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80', cat: 'mariage', label: 'Mariage' },
      { id: 'photo_3', src: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80', cat: 'mariage', label: 'Mariage' },
      { id: 'photo_4', src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80', cat: 'anniversaire', label: 'Anniversaire' },
      { id: 'photo_5', src: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80', cat: 'anniversaire', label: 'Anniversaire' },
      { id: 'photo_6', src: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80', cat: 'anniversaire', label: 'Anniversaire' },
      { id: 'photo_7', src: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80', cat: 'pro', label: 'Événement Pro' },
      { id: 'photo_8', src: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80', cat: 'pro', label: 'Événement Pro' },
      { id: 'photo_9', src: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80', cat: 'pro', label: 'Événement Pro' },
      { id: 'photo_10', src: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80', cat: 'deco', label: 'Location Déco' },
      { id: 'photo_11', src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', cat: 'deco', label: 'Location Déco' },
      { id: 'photo_12', src: 'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=800&q=80', cat: 'deco', label: 'Location Déco' },
    ],
  });
  const content = [
    ['about_page', aboutPageDefault],
    ['max_consecutive_days', '7'],
    ['images_home', '{}'],
    ['images_contact', '{}'],
    ['home_categories_style', '{}'],
    ['images_galerie', galerieDefault],
  ]
  for (const [key, value] of content) await sql('INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO NOTHING').run(key, value, t)

  // OA_SKIP_CATALOG_SEED: set by scripts/migrate-sqlite-to-postgres.mjs, which brings the real data.
  const { n } = await sql('SELECT COUNT(*) AS n FROM materials').get()
  if (!n && !process.env.OA_SKIP_CATALOG_SEED) await seedCatalogue(sql)

  // Persist IDs once so later category renames keep their homepage tiles.
  if (!(await sql("SELECT 1 FROM site_content WHERE key = 'home_category_tiles'").get())) {
    const categories = await sql('SELECT id, name FROM categories').all()
    if (categories.length) await sql('INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO NOTHING')
      .run('home_category_tiles', JSON.stringify({ tiles: defaultHomeCategoryTiles(categories) }), t)
  }

  // Every material gets a URL slug from its name (once — kept on rename).
  const unslugged = await sql("SELECT id, name FROM materials WHERE slug IS NULL OR slug = ''").all()
  if (unslugged.length) {
    const taken = await sql('SELECT slug FROM materials WHERE slug IS NOT NULL UNION SELECT slug FROM products').all()
    const used = new Set(taken.map(r => r.slug))
    for (const m of unslugged) {
      const base = slugify(m.name) || slugify(m.id)
      let slug = base
      for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`
      used.add(slug)
      await sql('UPDATE materials SET slug = ? WHERE id = ?').run(slug, m.id)
    }
  }
}

async function seedCatalogue(sql) {
  const t = now()
  const categories = [...REAL_CATEGORIES, BROCHURE_CATEGORY]
  for (const cat of categories) {
    const tile = CATALOGUE_TILES.findIndex(x => x.name === cat.name)
    const info = CATALOGUE_TILES[tile] || {}
    await sql('INSERT INTO categories (id, name, label, description, image_url, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING')
      .run(cat.id, cat.name, info.label || null, info.description || null, info.image_url || null, tile >= 0 ? tile : CATALOGUE_TILES.length, t)
  }
  for (const mat of REAL_MATERIALS) {
    await sql('INSERT INTO materials (id, name, description, category, max_quantity, min_order_qty, available, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, true, ?, ?)')
      .run(mat.id, mat.name, mat.description || null, mat.category, mat.max_quantity, mat.min_order_qty || null, mat.image_url || null, t)
    for (const [i, [minQty, maxQty, weekdayHt, weekendHt]] of mat.tiers.entries()) {
      await sql('INSERT INTO material_price_tiers (id, material_id, min_qty, max_qty, price_weekday_ht, price_weekend_ht, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), mat.id, minQty, maxQty, weekdayHt, weekendHt, i, t)
    }
  }
  for (const mat of BROCHURE_MATERIALS) {
    await sql('INSERT INTO materials (id, name, description, category, max_quantity, available, image_url, created_at) VALUES (?, ?, ?, ?, ?, true, ?, ?)')
      .run(mat.id, mat.name, mat.description || null, mat.category, mat.max_quantity, `/pics/${mat.image}.jpg`, t)
    const ht = Math.round((mat.ttc / 1.2) * 1e6) / 1e6
    await sql('INSERT INTO material_price_tiers (id, material_id, min_qty, max_qty, price_weekday_ht, price_weekend_ht, created_at) VALUES (?, ?, 1, NULL, ?, ?, ?)')
      .run(crypto.randomUUID(), mat.id, ht, ht, t)
  }
  for (const fam of PRODUCT_FAMILIES) {
    await sql('INSERT INTO products (id, slug, name, category, created_at) VALUES (?, ?, ?, ?, ?)').run(fam.id, fam.slug, fam.name, fam.category, t)
    for (const [i, [materialId, label]] of fam.variants.entries()) {
      await sql('UPDATE materials SET product_id = ?, variant_label = ?, variant_order = ? WHERE id = ?').run(fam.id, label, i + 1, materialId)
    }
  }
  console.log('[db] catalogue initial créé')
}

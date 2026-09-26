import crypto from 'crypto';
import fs from 'fs';
import { createClient } from '@libsql/client';
import { DEFAULT_GALERIE_PHOTOS } from './galerie-defaults.js';

// Uses a local file by default (same file as before, now read/written over
// libSQL instead of better-sqlite3) so local dev needs zero setup. Set
// TURSO_DATABASE_URL/TURSO_AUTH_TOKEN to point at a hosted libSQL/Turso
// database instead — same client, same query code either way, since
// better-sqlite3 can't run on Vercel (its serverless functions have a
// read-only filesystem, so writing a local .sqlite file there crashes).
// `data/` is gitignored (it holds the sqlite file), so a fresh clone doesn't
// have it — libSQL doesn't create missing parent directories itself and
// throws ConnectionFailed instead, so it has to exist before createClient runs.
if (!process.env.TURSO_DATABASE_URL) {
  fs.mkdirSync('./data', { recursive: true });
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./data/db.sqlite',
  authToken: process.env.TURSO_AUTH_TOKEN,
  intMode: 'number',
});

function normalizeArgs(args) {
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

// Thin shim over the async libSQL client that mimics better-sqlite3's
// db.prepare(sql).get/all/run(...) shape, so call sites only needed `await`
// added rather than a full rewrite to client.execute({ sql, args }).
const db = {
  prepare(sql) {
    return {
      async get(...args) {
        await ready();
        const { rows } = await client.execute({ sql, args: normalizeArgs(args) });
        return rows[0];
      },
      async all(...args) {
        await ready();
        const { rows } = await client.execute({ sql, args: normalizeArgs(args) });
        return rows;
      },
      async run(...args) {
        await ready();
        const result = await client.execute({ sql, args: normalizeArgs(args) });
        return { changes: Number(result.rowsAffected), lastInsertRowid: result.lastInsertRowid };
      },
    };
  },
  // Not a real atomic transaction (libSQL interactive transactions would
  // need every call site to thread a tx handle through instead of using the
  // shared `db.prepare` above) — just sequential execution against the same
  // connection. Fine here since every usage is a loop of independent inserts
  // built from already-validated in-memory data, not interdependent reads.
  transaction(fn) {
    return async (...args) => {
      await ready();
      return fn(...args);
    };
  },
};

async function ensureColumn(table, column, definition) {
  const { rows } = await client.execute(`PRAGMA table_info(${table})`);
  if (!rows.some((c) => c.name === column)) {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Alphabet avoids visually ambiguous characters (0/O, 1/I/L) since this
// code is meant to be read off an email and typed back on /suivi.
const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export async function generateReservationReference() {
  await ready();
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = 'OA-';
    for (let i = 0; i < 6; i++) {
      code += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
    }
    const exists = await db.prepare('SELECT 1 FROM reservations WHERE reference = ?').get(code);
    if (!exists) return code;
  }
  throw new Error('Impossible de générer une référence unique');
}

let readyPromise = null;
function ready() {
  if (!readyPromise) readyPromise = init();
  return readyPromise;
}

async function init() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      max_quantity INTEGER DEFAULT 1,
      available INTEGER DEFAULT 1,
      image_url TEXT,
      price REAL DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      phone TEXT,
      date TEXT NOT NULL,
      dates TEXT DEFAULT '[]',
      event_type TEXT,
      nb_persons INTEGER,
      materials TEXT DEFAULT '[]',
      message TEXT,
      status TEXT DEFAULT 'pending',
      delivery_address TEXT,
      distance_km REAL,
      delivery_fee REAL,
      materials_total REAL,
      grand_total REAL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS blocked_dates (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      reason TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS blocked_hours (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      hour TEXT NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    );

    -- Same key/value shape as settings, but public-GET (see requiresAuth in
    -- pages/api/db.js) — settings stays admin-only end-to-end because it
    -- also holds bank_iban/bank_bic, so page copy that the public site needs
    -- to read while logged out (e.g. the À Propos text/photo) lives here
    -- instead, to avoid ever having to make bank details publicly readable.
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      reservation_id TEXT NOT NULL,
      stripe_payment_intent_id TEXT,
      method TEXT DEFAULT 'card',
      amount REAL NOT NULL,
      installment_index INTEGER NOT NULL,
      installment_label TEXT,
      due_date TEXT,
      status TEXT DEFAULT 'pending',
      failure_message TEXT,
      paid_at TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS material_price_tiers (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      min_qty INTEGER NOT NULL DEFAULT 1,
      max_qty INTEGER,
      price_weekday_ht REAL NOT NULL DEFAULT 0,
      price_weekend_ht REAL NOT NULL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT
    );
  `);

  // Migrate existing databases created before new columns were added
  await ensureColumn('materials', 'price', 'REAL DEFAULT 0');
  await ensureColumn('reservations', 'prenom', 'TEXT');
  await ensureColumn('reservations', 'nom', 'TEXT');
  await ensureColumn('reservations', 'delivery_address', 'TEXT');
  await ensureColumn('reservations', 'distance_km', 'REAL');
  await ensureColumn('reservations', 'delivery_fee', 'REAL');
  await ensureColumn('reservations', 'materials_total', 'REAL');
  await ensureColumn('reservations', 'grand_total', 'REAL');
  await ensureColumn('reservations', 'stripe_customer_id', 'TEXT');
  await ensureColumn('reservations', 'payment_method', 'TEXT'); // 'card' | 'virement'
  await ensureColumn('reservations', 'reference', 'TEXT'); // human-facing order number, e.g. OA-K7M2QX
  await ensureColumn('reservations', 'notified_status', 'TEXT'); // last status an email was sent for — avoids re-sending on repeat clicks
  // Delivery rate actually used for this quote, captured at booking time —
  // so the price breakdown shown later always matches what delivery_fee was
  // computed from, even if the base fee/per-km rate in Réglages changes afterwards.
  await ensureColumn('reservations', 'quote_base_fee', 'REAL');
  await ensureColumn('reservations', 'quote_per_km', 'REAL');
  // Later installments are charged automatically by a dedicated Stripe
  // Subscription Schedule per installment (one schedule = one future charge),
  // rather than a single schedule with one phase per installment — so a
  // payment failure on one installment can never affect the others (see
  // src/lib/stripe.js createInstallmentAutoCharge). This column correlates an
  // incoming invoice.paid/invoice.payment_failed webhook back to its row.
  await ensureColumn('payments', 'stripe_subscription_id', 'TEXT');
  // Minimum rentable quantity for this item (e.g. Chaise Napoléon = 20) —
  // NULL means no minimum. Enforced client-side in the booking wizard.
  await ensureColumn('materials', 'min_order_qty', 'INTEGER');

  await client.executeMultiple(`
    CREATE INDEX IF NOT EXISTS idx_payments_reservation ON payments(reservation_id);
    CREATE INDEX IF NOT EXISTS idx_payments_due_status ON payments(due_date, status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_reference ON reservations(reference);
    CREATE INDEX IF NOT EXISTS idx_material_price_tiers_material ON material_price_tiers(material_id);
  `);

  // Seed default categories if empty
  const { rows: catRows } = await client.execute('SELECT COUNT(*) as count FROM categories');
  if (catRows[0].count === 0) {
    const categories = [
      { id: 'c1', name: 'MOBILIER' },
      { id: 'c2', name: 'LINGE DE TABLE' },
      { id: 'c3', name: 'DÉCORATION' },
      { id: 'c4', name: 'ÉCLAIRAGE' },
    ];
    const now = new Date().toISOString();
    for (const cat of categories) {
      await client.execute({
        sql: 'INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)',
        args: [cat.id, cat.name, now],
      });
    }
  }

  // Seed default materials if empty
  const { rows: matRows } = await client.execute('SELECT COUNT(*) as count FROM materials');
  if (matRows[0].count === 0) {
    const materials = [
      { id: '1', name: 'Chaises Chiavari', description: 'Chaises élégantes dorées ou blanches', category: 'MOBILIER', max_quantity: 50 },
      { id: '2', name: 'Tables rondes (Ø150cm)', description: 'Tables pour 8-10 personnes', category: 'MOBILIER', max_quantity: 10 },
      { id: '3', name: 'Tables rectangulaires', description: 'Tables banquet 180×75 cm', category: 'MOBILIER', max_quantity: 8 },
      { id: '4', name: 'Nappes blanches', description: 'Nappes satin blanc', category: 'LINGE DE TABLE', max_quantity: 30 },
      { id: '5', name: 'Nappes rose gold', description: 'Nappes satin rose gold', category: 'LINGE DE TABLE', max_quantity: 20 },
      { id: '6', name: 'Chemin de table', description: 'Chemin de table organza', category: 'LINGE DE TABLE', max_quantity: 25 },
      { id: '7', name: 'Arche florale', description: 'Arche décorée de fleurs', category: 'DÉCORATION', max_quantity: 20 },
      { id: '8', name: 'Photobooth', description: 'Structure photobooth avec fond', category: 'DÉCORATION', max_quantity: 1 },
      { id: '9', name: 'Vases cylindriques', description: 'Vases en verre transparent', category: 'DÉCORATION', max_quantity: 30 },
      { id: '10', name: 'Bougies LED', description: 'Bougies à flamme réaliste', category: 'ÉCLAIRAGE', max_quantity: 60 },
      { id: '11', name: 'Guirlandes lumineuses', description: 'Guirlandes 10 m, blanc chaud', category: 'ÉCLAIRAGE', max_quantity: 10 },
      { id: '12', name: 'Projecteurs LED', description: 'Projecteurs RGB sur pied', category: 'ÉCLAIRAGE', max_quantity: 6 },
    ];
    const now = new Date().toISOString();
    for (const mat of materials) {
      await client.execute({
        sql: `INSERT INTO materials (id, name, description, category, max_quantity, available, image_url, created_at)
              VALUES (?, ?, ?, ?, ?, 1, NULL, ?)`,
        args: [mat.id, mat.name, mat.description, mat.category, mat.max_quantity, now],
      });
    }
  }

  // Seed each setting key independently (INSERT OR IGNORE) rather than only
  // when the whole table is empty — otherwise a key added later (like the
  // bank_* ones) would never get inserted for a database that already has
  // earlier settings rows in it, and every read/update against that key
  // would silently no-op forever.
  const settingsNow = new Date().toISOString();
  const settingDefaults = [
    ['depot_address', process.env.DEPOT_ADDRESS || '72 rue Victor Basch, 92120 Montrouge, France'],
    ['delivery_base_fee', process.env.DELIVERY_BASE_FEE || '15'],
    ['delivery_per_km', process.env.DELIVERY_PER_KM || '1.2'],
    ['bank_holder', ''],
    ['bank_iban', ''],
    ['bank_bic', ''],
    ['installment_min_total_4x', '300'],
    ['installment_2x_min_amount', '0'],
    ['installment_3x_min_amount', '0'],
  ];
  for (const [key, value] of settingDefaults) {
    await client.execute({
      sql: 'INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
      args: [key, value, settingsNow],
    });
  }

  // À Propos page content, editable from Espace OA > À Propos — seeded with
  // the exact same placeholder copy pages/a-propos.jsx used to hardcode, so
  // nothing visually changes until it's actually edited in the admin.
  const aboutPageDefault = JSON.stringify({
    founderName: "[Prénom Nom], fondateur d'OA Événementiel",
    story: "[Votre histoire ici — pourquoi ce métier vous anime, depuis quand vous organisez des événements, ce qui rend votre approche différente. Deux ou trois phrases suffisent, je les mettrai en forme.]",
    photoUrl: null,
    counters: [
      { count: '[X]+', label: '[Ex : Ans d\'expérience]' },
      { count: '[X]+', label: '[Ex : Événements réalisés]' },
    ],
    values: [
      { title: '[Créativité sur-mesure]', text: '[Description à personnaliser.]' },
      { title: '[Logistique maîtrisée]', text: '[Description à personnaliser.]' },
      { title: '[Écoute & Accompagnement]', text: '[Description à personnaliser.]' },
      { title: '[Confiance & Transparence]', text: '[Description à personnaliser.]' },
    ],
  });
  await client.execute({
    sql: 'INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (?, ?, ?)',
    args: ['about_page', aboutPageDefault, settingsNow],
  });

  // Max consecutive days selectable in the booking wizard's calendar step —
  // lives in site_content (not settings) because the wizard is a public,
  // logged-out page and needs to read it without auth, editable from
  // Espace OA > Réglages.
  await client.execute({
    sql: 'INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (?, ?, ?)',
    args: ['max_consecutive_days', '7', settingsNow],
  });

  // Per-page image overrides, editable from Espace OA > Visuel Site. Each
  // starts empty ({}) — public pages fall back to their own hardcoded
  // default image per slot when a key is missing, so an empty row changes
  // nothing visually until an admin actually replaces a photo.
  for (const key of ['images_home', 'images_services', 'images_contact']) {
    await client.execute({
      sql: 'INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (?, ?, ?)',
      args: [key, '{}', settingsNow],
    });
  }
  // Galerie is a dynamic list (add/remove from Espace OA > Visuel Site >
  // Galerie), not fixed slots — seeded with the real event photos from
  // src/lib/galerie-defaults.js, so a fresh DB's admin list and public page
  // start in sync instead of the admin seeing an empty list.
  const galerieDefault = JSON.stringify({ page_header: null, photos: DEFAULT_GALERIE_PHOTOS });
  await client.execute({
    sql: 'INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (?, ?, ?)',
    args: ['images_galerie', galerieDefault, settingsNow],
  });
  // Older DBs were seeded with Unsplash placeholder photos. Swap them for the
  // real ones — but only photos still pointing at Unsplash, so anything the
  // admin uploaded in the meantime is kept (and stays first in the list).
  const galerieRow = await client.execute("SELECT value FROM site_content WHERE key = 'images_galerie'");
  if (galerieRow.rows.length) {
    let parsed = null;
    try { parsed = JSON.parse(galerieRow.rows[0].value); } catch {}
    const photos = Array.isArray(parsed?.photos) ? parsed.photos : null;
    if (photos && photos.some(p => String(p.src).includes('images.unsplash.com'))) {
      const kept = photos.filter(p => !String(p.src).includes('images.unsplash.com'));
      await client.execute({
        sql: "UPDATE site_content SET value = ?, updated_at = ? WHERE key = 'images_galerie'",
        args: [JSON.stringify({ ...parsed, photos: [...kept, ...DEFAULT_GALERIE_PHOTOS] }), settingsNow],
      });
    }
  }

  // One-time migration: replace the placeholder demo catalog seeded above
  // (only ever ran on a brand-new DB) with the real price list from the
  // business owners. Guarded by a flag rather than an empty-table check,
  // since an already-seeded dev DB isn't empty — runs exactly once per DB.
  const catalogFlag = await client.execute("SELECT value FROM settings WHERE key = 'catalog_v2_seeded'");
  if (!catalogFlag.rows.length || catalogFlag.rows[0].value !== '1') {
    await seedRealCatalog();
    await client.execute({
      sql: "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('catalog_v2_seeded', '1', ?)",
      args: [new Date().toISOString()],
    });
  }

  // Swap tall photos for their 4:3 catalogue versions — only where the
  // image is still the one set by seedBrochureAdditions (not an admin upload).
  for (const name of ['arche-ronde', 'rideau-classique', 'tables-basses-marbre', 'tables-miroir-dorees']) {
    await client.execute({
      sql: 'UPDATE materials SET image_url = ? WHERE image_url = ?',
      args: [`/pics/catalogue/${name}.jpg`, `/pics/${name}.jpg`],
    });
  }

  // Brochure items missing from the catalog + product photos from pics/.
  // Runs once per DB (flag), so admin edits/deletions made afterwards stick.
  const brochureFlag = await client.execute("SELECT value FROM settings WHERE key = 'catalog_v3_brochure'");
  if (!brochureFlag.rows.length || brochureFlag.rows[0].value !== '1') {
    await seedBrochureAdditions();
    await client.execute({
      sql: "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('catalog_v3_brochure', '1', ?)",
      args: [new Date().toISOString()],
    });
  }
}

const DEMO_CATEGORY_IDS = ['c1', 'c2', 'c3', 'c4'];
const DEMO_MATERIAL_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const REAL_CATEGORIES = [
  { id: 'cat-banquettes', name: 'BANQUETTES' },
  { id: 'cat-decorations', name: 'DÉCORATIONS' },
  { id: 'cat-tables', name: 'TABLES' },
  { id: 'cat-chaises', name: 'CHAISES' },
  { id: 'cat-tentes', name: 'TENTES' },
  { id: 'cat-options', name: 'OPTIONS & ACCESSOIRES' },
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
    tiers: [[1, null, 70.00, 80.00]] },
  { id: 'mat-banq-2-taupe', name: 'Banquette 2 places – Taupe', category: 'BANQUETTES', max_quantity: 10,
    tiers: [[1, null, 70.00, 80.00]] },
  { id: 'mat-banq-3-beige', name: 'Banquette 3 places – Beige', category: 'BANQUETTES', max_quantity: 10,
    tiers: [[1, null, 130.00, 150.00]] },

  // Décorations
  { id: 'mat-deco-rideau-classique', name: 'Rideau classique 3 × 3 m', description: 'Structure incluse', category: 'DÉCORATIONS', max_quantity: 4,
    tiers: [[1, null, 45.00, 50.00]] },
  { id: 'mat-deco-rideau-tresse', name: 'Rideau tressé 3 × 4 m', description: 'Structure incluse', category: 'DÉCORATIONS', max_quantity: 4,
    tiers: [[1, null, 90.00, 100.00]] },
  { id: 'mat-deco-arche-ronde', name: 'Arche de fleurs ronde', description: 'Structure + fleurs incluses', category: 'DÉCORATIONS', max_quantity: 4,
    tiers: [[1, null, 35.00, 40.00]] },
  { id: 'mat-deco-arche-carree', name: 'Arche de fleurs carrée', description: 'Structure + fleurs incluses', category: 'DÉCORATIONS', max_quantity: 4,
    tiers: [[1, null, 35.00, 40.00]] },
  { id: 'mat-deco-tables-basses', name: 'Lot de 2 tables basses effet marbre', category: 'DÉCORATIONS', max_quantity: 6,
    tiers: [[1, null, 35.00, 40.00]] },

  // Tables — real stock counts from the owners
  { id: 'mat-table-rect', name: 'Table rectangulaire', category: 'TABLES', max_quantity: 80,
    tiers: [[1, 9, 10.20, 12.00], [10, 19, 9.18, 10.80], [20, null, 8.67, 10.20]] },
  { id: 'mat-table-ronde-152', name: 'Table ronde Ø152 cm', category: 'TABLES', max_quantity: 30,
    tiers: [[1, 9, 11.90, 14.00], [10, 19, 10.71, 12.60], [20, null, 10.12, 11.90]] },
  { id: 'mat-table-ronde-180', name: 'Table ronde Ø180 cm', category: 'TABLES', max_quantity: 15,
    tiers: [[1, 9, 15.30, 18.00], [10, 19, 13.77, 16.20], [20, null, 13.01, 15.30]] },

  // Chaises
  { id: 'mat-chaise-napoleon', name: 'Chaise Napoléon', category: 'CHAISES', max_quantity: 500, min_order_qty: 20,
    tiers: [[20, 79, 2.76, 3.33], [80, 150, 2.66, 3.20], [151, 250, 2.49, 3.00], [251, 500, 2.08, 2.50]] },

  // Tentes / Barnum
  { id: 'mat-tente-32', name: 'Tente de réception 32 m² (4 × 8 m)', description: 'Installation, désinstallation et lestage (150 kg) inclus. Hors frais kilométriques.', category: 'TENTES', max_quantity: 6,
    tiers: [[1, 2, 199.50, 210.00], [3, null, 179.55, 189.00]] },
  { id: 'mat-tente-50', name: 'Tente de réception 50 m² (5 × 10 m)', description: 'Installation, désinstallation et lestage (200 kg) inclus. Hors frais kilométriques.', category: 'TENTES', max_quantity: 6,
    tiers: [[1, 2, 247.00, 260.00], [3, null, 222.30, 234.00]] },
  { id: 'mat-tente-72', name: 'Tente de réception 72 m² (6 × 12 m)', description: 'Installation, désinstallation et lestage (250 kg) inclus. Hors frais kilométriques.', category: 'TENTES', max_quantity: 2,
    tiers: [[1, null, 332.50, 350.00]] },
  { id: 'mat-tente-100', name: 'Tente de réception 100 m² (5 × 20 m)', description: 'Installation, désinstallation et lestage (300 kg) inclus. Hors frais kilométriques.', category: 'TENTES', max_quantity: 2,
    tiers: [[1, null, 551.00, 580.00]] },

  // Options & Accessoires — no weekday/weekend split given, so weekday and
  // weekend HT are identical.
  { id: 'mat-opt-kit-led', name: 'Kit Lumière LED', description: '2 barres LED 6000 W', category: 'OPTIONS & ACCESSOIRES', max_quantity: 10,
    tiers: [[1, null, 40.00, 40.00]] },
  { id: 'mat-opt-parasol', name: 'Parasol chauffant électrique', category: 'OPTIONS & ACCESSOIRES', max_quantity: 6,
    tiers: [[1, 3, 50.00, 50.00], [4, 6, 40.00, 40.00]] },
  { id: 'mat-opt-rallonge-5', name: 'Rallonge électrique 5 mètres', category: 'OPTIONS & ACCESSOIRES', max_quantity: 20,
    tiers: [[1, null, 3.00, 3.00]] },
  { id: 'mat-opt-rallonge-10', name: 'Rallonge électrique 10 mètres', category: 'OPTIONS & ACCESSOIRES', max_quantity: 20,
    tiers: [[1, null, 5.00, 5.00]] },
  { id: 'mat-opt-poids-15', name: 'Poids de lestage 15 kg', category: 'OPTIONS & ACCESSOIRES', max_quantity: 30,
    tiers: [[1, null, 5.00, 5.00]] },
  { id: 'mat-opt-poids-30', name: 'Poids de lestage 30 kg', category: 'OPTIONS & ACCESSOIRES', max_quantity: 30,
    tiers: [[1, null, 10.00, 10.00]] },
  { id: 'mat-opt-galette', name: 'Option galette de chaise', description: 'Option pour Chaise Napoléon', category: 'OPTIONS & ACCESSOIRES', max_quantity: 500,
    tiers: [[1, null, 0.50, 0.50]] },
];

async function seedRealCatalog() {
  const now = new Date().toISOString();

  // Remove the placeholder demo catalog if present (ids from the original
  // seed above) — a no-op on a DB where it was never seeded.
  for (const id of DEMO_MATERIAL_IDS) {
    await client.execute({ sql: 'DELETE FROM material_price_tiers WHERE material_id = ?', args: [id] });
    await client.execute({ sql: 'DELETE FROM materials WHERE id = ?', args: [id] });
  }
  for (const id of DEMO_CATEGORY_IDS) {
    await client.execute({ sql: 'DELETE FROM categories WHERE id = ?', args: [id] });
  }

  for (const cat of REAL_CATEGORIES) {
    await client.execute({
      sql: 'INSERT OR IGNORE INTO categories (id, name, created_at) VALUES (?, ?, ?)',
      args: [cat.id, cat.name, now],
    });
  }

  for (const mat of REAL_MATERIALS) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO materials (id, name, description, category, max_quantity, min_order_qty, available, image_url, price, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, NULL, 0, ?)`,
      args: [mat.id, mat.name, mat.description || null, mat.category, mat.max_quantity, mat.min_order_qty || null, now],
    });
    for (const [minQty, maxQty, weekdayHt, weekendHt] of mat.tiers) {
      await client.execute({
        sql: `INSERT INTO material_price_tiers (id, material_id, min_qty, max_qty, price_weekday_ht, price_weekend_ht, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), mat.id, minQty, maxQty, weekdayHt, weekendHt, now],
      });
    }
  }
}

// Items from the owners' brochures (pics/Brochure OA *.jpeg) that weren't in
// the price sheet above. Brochure prices are TTC, flat (no weekday/weekend
// split), so HT = TTC / 1.2 — stored with enough decimals that
// ttcFromHt() rounds back to the exact brochure price. Stock is a
// placeholder to correct via Espace OA > Matériel.
const BROCHURE_CATEGORY = { id: 'cat-vaisselle', name: 'VAISSELLE & ART DE LA TABLE' };
const BROCHURE_MATERIALS = [
  { id: 'mat-vaisselle-kit', name: 'Kit complet vaisselle (par personne)', description: 'Grande et petite assiette, couverts or ou argent. À rendre sale.', category: BROCHURE_CATEGORY.name, max_quantity: 500, ttc: 3.50, image: 'kit-vaisselle' },
  { id: 'mat-vaisselle-verres', name: 'Option verres à pied et à eau (par personne)', description: 'Les 2 verres, en complément du kit vaisselle.', category: BROCHURE_CATEGORY.name, max_quantity: 500, ttc: 0.50, image: 'verres' },
  { id: 'mat-vaisselle-sous-assiette', name: 'Sous-assiette dorée transparente', category: BROCHURE_CATEGORY.name, max_quantity: 300, ttc: 1.00, image: 'sous-assiettes-dorees' },
  { id: 'mat-vaisselle-nappe', name: 'Nappe professionnelle', description: 'Livrée propre et repassée, à rendre sale.', category: BROCHURE_CATEGORY.name, max_quantity: 80, ttc: 12.00, image: 'nappes' },
  { id: 'mat-deco-tables-miroir', name: 'Lot de 2 tables miroir dorées', category: 'DÉCORATIONS', max_quantity: 3, ttc: 30.00, image: 'catalogue/tables-miroir-dorees' },
];

// Product photo (public/pics/<name>.jpg) per existing catalog item — only
// applied where no image has been set yet, never over an admin upload.
// pics/catalogue/ holds 4:3 versions of tall photos (whole photo over a
// blurred fill) so the catalogue's 4:3 frame doesn't cut the subject, e.g.
// the sofa under the flower arch.
const MATERIAL_IMAGES = {
  'mat-banq-2-beige': 'banquette-2-places-beige',
  'mat-banq-2-taupe': 'banquette-2-places-taupe',
  'mat-banq-3-beige': 'banquette-3-places-beige',
  'mat-chaise-napoleon': 'chaises-napoleon',
  'mat-deco-arche-carree': 'arche-carree',
  'mat-deco-arche-ronde': 'catalogue/arche-ronde',
  'mat-deco-rideau-classique': 'catalogue/rideau-classique',
  'mat-deco-rideau-tresse': 'rideau-tresse',
  'mat-deco-tables-basses': 'catalogue/tables-basses-marbre',
  'mat-opt-kit-led': 'kit-lumiere-led',
  'mat-opt-parasol': 'tente-parasol-chauffant',
  'mat-opt-poids-15': 'tente-poids-lestage',
  'mat-opt-poids-30': 'tente-poids-lestage',
  'mat-table-rect': 'table-rectangulaire',
  'mat-table-ronde-152': 'table-ronde-152',
  'mat-table-ronde-180': 'table-ronde-180',
  'mat-tente-32': 'tente-32m2',
  'mat-tente-50': 'tente-50m2',
  'mat-tente-72': 'tente-72m2',
  'mat-tente-100': 'tente-100m2',
};

async function seedBrochureAdditions() {
  const now = new Date().toISOString();
  await client.execute({
    sql: 'INSERT OR IGNORE INTO categories (id, name, created_at) VALUES (?, ?, ?)',
    args: [BROCHURE_CATEGORY.id, BROCHURE_CATEGORY.name, now],
  });
  for (const mat of BROCHURE_MATERIALS) {
    const inserted = await client.execute({
      sql: `INSERT OR IGNORE INTO materials (id, name, description, category, max_quantity, available, image_url, price, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, 0, ?)`,
      args: [mat.id, mat.name, mat.description || null, mat.category, mat.max_quantity, `/pics/${mat.image}.jpg`, now],
    });
    if (!inserted.rowsAffected) continue;
    const ht = Math.round((mat.ttc / 1.2) * 1e6) / 1e6;
    await client.execute({
      sql: `INSERT INTO material_price_tiers (id, material_id, min_qty, max_qty, price_weekday_ht, price_weekend_ht, created_at)
            VALUES (?, ?, 1, NULL, ?, ?, ?)`,
      args: [crypto.randomUUID(), mat.id, ht, ht, now],
    });
  }
  for (const [id, image] of Object.entries(MATERIAL_IMAGES)) {
    await client.execute({
      sql: "UPDATE materials SET image_url = ? WHERE id = ? AND (image_url IS NULL OR image_url = '')",
      args: [`/pics/${image}.jpg`, id],
    });
  }
  // Append the new gallery photos (pics/) to an already-seeded gallery.
  const galerieRow = await client.execute("SELECT value FROM site_content WHERE key = 'images_galerie'");
  if (galerieRow.rows.length) {
    let parsed = null;
    try { parsed = JSON.parse(galerieRow.rows[0].value); } catch {}
    if (Array.isArray(parsed?.photos)) {
      const existing = new Set(parsed.photos.map(p => p.src));
      const missing = DEFAULT_GALERIE_PHOTOS
        .filter(p => p.src.startsWith('/pics/') && !existing.has(p.src))
        .map(p => ({ ...p, id: 'pics-' + p.src.slice('/pics/'.length, -'.jpg'.length) }));
      if (missing.length) {
        await client.execute({
          sql: "UPDATE site_content SET value = ?, updated_at = ? WHERE key = 'images_galerie'",
          args: [JSON.stringify({ ...parsed, photos: [...parsed.photos, ...missing] }), now],
        });
      }
    }
  }
}

export default db;

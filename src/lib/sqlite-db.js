import crypto from 'crypto';
import { createClient } from '@libsql/client';
import { slugify } from './slug.js';

// Uses a local file by default (same file as before, now read/written over
// libSQL instead of better-sqlite3) so local dev needs zero setup. Set
// TURSO_DATABASE_URL/TURSO_AUTH_TOKEN to point at a hosted libSQL/Turso
// database instead — same client, same query code either way, since
// better-sqlite3 can't run on Vercel (its serverless functions have a
// read-only filesystem, so writing a local .sqlite file there crashes).
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
  close() { client.close(); },
  async writeTransaction(fn) {
    await ready();
    const tx = await client.transaction('write');
    const scoped = {
      prepare(sql) {
        const execute = args => tx.execute({ sql, args: normalizeArgs(args) });
        return {
          async get(...args) { return (await execute(args)).rows[0]; },
          async all(...args) { return (await execute(args)).rows; },
          async run(...args) { const r = await execute(args); return { changes: r.rowsAffected }; },
        };
      },
    };
    try { const result = await fn(scoped); await tx.commit(); return result; }
    finally { tx.close(); }
  },
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
  // Local readers (availability/admin) must not block a checkout writer.
  if (!process.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL.startsWith('file:')) await client.execute('PRAGMA journal_mode = WAL');
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

    CREATE TABLE IF NOT EXISTS customer_accounts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      civility TEXT,
      account_type TEXT NOT NULL DEFAULT 'particulier',
      company_name TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Migrate existing databases created before new columns were added
  await ensureColumn('materials', 'price', 'REAL DEFAULT 0');
  // The contact form (pages/contact.jsx) and the admin Messages tab both use
  // these, but the table never had them — every contact insert failed.
  await ensureColumn('contacts', 'prenom', 'TEXT');
  await ensureColumn('contacts', 'nom', 'TEXT');
  await ensureColumn('contacts', 'telephone', 'TEXT');
  await ensureColumn('contacts', 'type_evenement', 'TEXT');
  await ensureColumn('reservations', 'prenom', 'TEXT');
  await ensureColumn('reservations', 'nom', 'TEXT');
  await ensureColumn('reservations', 'delivery_address', 'TEXT');
  await ensureColumn('reservations', 'distance_km', 'REAL');
  await ensureColumn('reservations', 'delivery_fee', 'REAL');
  await ensureColumn('reservations', 'materials_total', 'REAL');
  await ensureColumn('reservations', 'grand_total', 'REAL');
  await ensureColumn('reservations', 'order_kind', 'TEXT');
  await ensureColumn('reservations', 'expires_at', 'TEXT');
  await ensureColumn('reservations', 'payment_lock', 'TEXT');
  await ensureColumn('reservations', 'payment_lock_until', 'TEXT');
  await ensureColumn('reservations', 'checkout_key', 'TEXT');
  await ensureColumn('reservations', 'checkout_fingerprint', 'TEXT');
  await ensureColumn('reservations', 'rental_hours', "TEXT DEFAULT '[]'");
  await ensureColumn('customer_accounts', 'session_version', 'INTEGER NOT NULL DEFAULT 0');
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS customer_password_resets (
      id TEXT PRIMARY KEY, account_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
      session_version INTEGER NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL,
      used_at TEXT, sent_at TEXT, changed_notice_sent_at TEXT, last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS customer_reset_account ON customer_password_resets(account_id, created_at);
    CREATE TABLE IF NOT EXISTS customer_welcome_emails (
      account_id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
      sent_at TEXT, last_error TEXT
    );
  `);
  await client.executeMultiple(`
    CREATE UNIQUE INDEX IF NOT EXISTS reservation_checkout_key ON reservations(checkout_key) WHERE checkout_key IS NOT NULL;
    CREATE TABLE IF NOT EXISTS order_emails (
      id TEXT PRIMARY KEY, recipient TEXT NOT NULL, subject TEXT NOT NULL,
      html TEXT NOT NULL, sent_at TEXT, last_error TEXT
    );
  `);
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

  // Product / variant model behind /catalogue/[slug]. A material is one
  // purchasable configuration (own price tiers, stock, image). Materials
  // sharing a product_id are variants of that product (Poids de lestage
  // 15 kg / 30 kg) and get the multiple-options page; a material with no
  // product_id is a product on its own and gets the single-option page.
  // slug is stored (not derived on every request) so renaming an item in
  // Espace OA doesn't break links already shared.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      created_at TEXT
    )
  `);
  // Photos uploaded from Espace OA, stored in the database rather than in
  // public/uploads/ — so they follow the database (Turso) to every machine
  // and to production, where the filesystem is read-only or not shared.
  // Served at the same /uploads/<path> URLs as before by
  // pages/api/files/[...path].js (see the rewrite in next.config.js).
  await client.execute(`
    CREATE TABLE IF NOT EXISTS files (
      path TEXT PRIMARY KEY,
      mime TEXT NOT NULL,
      data BLOB NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT
    )
  `);
  await ensureColumn('materials', 'slug', 'TEXT');
  await ensureColumn('materials', 'product_id', 'TEXT');
  await ensureColumn('materials', 'variant_label', 'TEXT');
  await ensureColumn('materials', 'variant_order', 'INTEGER');
  // Catalogue tiles (/catalogue, /catalogue-2…, managed in Espace OA >
  // Catalogue): `name` stays the uppercase key stored in materials.category;
  // `label` is the title shown on the tile, `position` its order (6 a page).
  await ensureColumn('categories', 'label', 'TEXT');
  await ensureColumn('categories', 'description', 'TEXT');
  await ensureColumn('categories', 'image_url', 'TEXT');
  await ensureColumn('categories', 'position', 'INTEGER');

  await client.executeMultiple(`
    CREATE INDEX IF NOT EXISTS idx_payments_reservation ON payments(reservation_id);
    CREATE INDEX IF NOT EXISTS idx_payments_due_status ON payments(due_date, status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_reference ON reservations(reference);
    CREATE INDEX IF NOT EXISTS idx_material_price_tiers_material ON material_price_tiers(material_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_slug ON materials(slug);
    CREATE INDEX IF NOT EXISTS idx_materials_product ON materials(product_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_accounts_email ON customer_accounts(email COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_customer_accounts_created ON customer_accounts(created_at);
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
  // home_categories_style holds { hoverColor } for the homepage "Nos
  // catégories" tiles (Visuel Site > Accueil — Catégories).
  for (const key of ['images_home', 'images_services', 'images_contact', 'home_categories_style']) {
    await client.execute({
      sql: 'INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (?, ?, ?)',
      args: [key, '{}', settingsNow],
    });
  }
  // Galerie is a dynamic list (add/remove from Espace OA > Visuel Site >
  // Galerie), not fixed slots — seeded with the same 12 default photos
  // pages/galerie.jsx falls back to, so a fresh DB's admin list and public
  // page start in sync instead of the admin seeing an empty list.
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
  await client.execute({
    sql: 'INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (?, ?, ?)',
    args: ['images_galerie', galerieDefault, settingsNow],
  });

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

  const imagesFlag = await client.execute("SELECT value FROM settings WHERE key = 'catalog_images_v1'");
  if (!imagesFlag.rows.length || imagesFlag.rows[0].value !== '1') {
    for (const [id, url] of Object.entries(CATALOG_IMAGES)) {
      await client.execute({
        sql: 'UPDATE materials SET image_url = ? WHERE id = ? AND image_url IS NULL',
        args: [url, id],
      });
    }
    await client.execute({
      sql: "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('catalog_images_v1', '1', ?)",
      args: [new Date().toISOString()],
    });
  }

  // One-time: group the real catalogue's size/length/weight/colour variants
  // into products (see PRODUCT_FAMILIES). Flag-guarded like the seed above,
  // so later edits made in Espace OA are never overwritten.
  const familiesFlag = await client.execute("SELECT value FROM settings WHERE key = 'product_families_v1_seeded'");
  if (!familiesFlag.rows.length || familiesFlag.rows[0].value !== '1') {
    await seedProductFamilies();
    await client.execute({
      sql: "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('product_families_v1_seeded', '1', ?)",
      args: [new Date().toISOString()],
    });
  }

  // One-time: give the existing categories the title, text and photo the
  // /catalogue page used to hardcode. Flag-guarded so edits made in Espace OA
  // are never overwritten.
  const tilesFlag = await client.execute("SELECT value FROM settings WHERE key = 'catalogue_tiles_v1_seeded'");
  if (!tilesFlag.rows.length || tilesFlag.rows[0].value !== '1') {
    await seedCatalogueTiles();
    await client.execute({
      sql: "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('catalogue_tiles_v1_seeded', '1', ?)",
      args: [new Date().toISOString()],
    });
  }

  // Every material gets a URL slug from its name (once — kept on rename).
  // Runs on each start so items added since get one too; a clash with an
  // existing slug or product slug gets a -2, -3… suffix.
  const { rows: unslugged } = await client.execute('SELECT id, name FROM materials WHERE slug IS NULL OR slug = \'\'');
  if (unslugged.length) {
    const { rows: taken } = await client.execute('SELECT slug FROM materials WHERE slug IS NOT NULL UNION SELECT slug FROM products');
    const used = new Set(taken.map(r => r.slug));
    for (const m of unslugged) {
      const base = slugify(m.name) || slugify(m.id);
      let slug = base;
      for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
      used.add(slug);
      await client.execute({ sql: 'UPDATE materials SET slug = ? WHERE id = ?', args: [slug, m.id] });
    }
  }

  // Ensure default catalogue images are populated for materials that have missing images
  for (const mat of REAL_MATERIALS) {
    if (mat.image_url) {
      await client.execute({
        sql: "UPDATE materials SET image_url = ? WHERE id = ? AND (image_url IS NULL OR image_url = '')",
        args: [mat.image_url, mat.id],
      });
    }
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

async function seedCatalogueTiles() {
  for (const [i, tile] of CATALOGUE_TILES.entries()) {
    await client.execute({
      sql: `UPDATE categories SET label = COALESCE(label, ?), description = COALESCE(description, ?),
              image_url = COALESCE(image_url, ?), position = COALESCE(position, ?) WHERE name = ?`,
      args: [tile.label, tile.description, tile.image_url, i, tile.name],
    });
  }
  // Any other category goes after them, oldest first.
  const { rows } = await client.execute('SELECT id FROM categories WHERE position IS NULL ORDER BY created_at, name');
  for (const [i, row] of rows.entries()) {
    await client.execute({ sql: 'UPDATE categories SET position = ? WHERE id = ?', args: [CATALOGUE_TILES.length + i, row.id] });
  }
}

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
    image_url: null,
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
    image_url: null,
    tiers: [[1, null, 35.00, 40.00]] },

  // Tables — real stock counts from the owners
  { id: 'mat-table-rect', name: 'Table rectangulaire', category: 'TABLES', max_quantity: 80,
    image_url: '/uploads/materials/mat-table-rect.webp',
    tiers: [[1, 9, 10.20, 12.00], [10, 19, 9.18, 10.80], [20, null, 8.67, 10.20]] },
  { id: 'mat-table-ronde-152', name: 'Table ronde Ø152 cm', category: 'TABLES', max_quantity: 30,
    image_url: '/uploads/materials/mat-table-ronde-152.webp',
    tiers: [[1, 9, 11.90, 14.00], [10, 19, 10.71, 12.60], [20, null, 10.12, 11.90]] },
  { id: 'mat-table-ronde-180', name: 'Table ronde Ø180 cm', category: 'TABLES', max_quantity: 15,
    image_url: null,
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
    image_url: null,
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

async function seedProductFamilies() {
  const now = new Date().toISOString();
  for (const fam of PRODUCT_FAMILIES) {
    // Skip a family whose items aren't all in this DB (e.g. deleted in
    // Espace OA) rather than creating a half-empty product.
    const { rows } = await client.execute({
      sql: `SELECT id FROM materials WHERE id IN (${fam.variants.map(() => '?').join(',')})`,
      args: fam.variants.map(([id]) => id),
    });
    if (rows.length !== fam.variants.length) continue;
    await client.execute({
      sql: 'INSERT OR IGNORE INTO products (id, slug, name, description, category, created_at) VALUES (?, ?, ?, NULL, ?, ?)',
      args: [fam.id, fam.slug, fam.name, fam.category, now],
    });
    for (const [i, [materialId, label]] of fam.variants.entries()) {
      await client.execute({
        sql: 'UPDATE materials SET product_id = ?, variant_label = ?, variant_order = ? WHERE id = ?',
        args: [fam.id, label, i + 1, materialId],
      });
    }
  }
}

// Photos of the real catalog (files in public/catalogue_images/, listed in
// catalogue_images/manifest.json). Applied once per DB, only where no photo
// was set yet — an image uploaded from Espace OA is never overwritten.
const CATALOG_IMAGES = {
  'mat-banq-2-beige': '/catalogue_images/01_banquette-2-places-beige.jpg',
  'mat-banq-2-taupe': '/catalogue_images/02_banquette-2-places-taupe.jpg',
  'mat-deco-rideau-tresse': '/catalogue_images/05_rideau-tresse-3x4m.jpg',
  'mat-deco-arche-ronde': '/catalogue_images/06_arche-de-fleurs-ronde.jpg',
  'mat-deco-arche-carree': '/catalogue_images/07_arche-de-fleurs-carree.jpg',
  'mat-table-rect': '/catalogue_images/09_table-rectangulaire.jpg',
  'mat-table-ronde-152': '/catalogue_images/10_table-ronde-diam152cm.jpg',
  'mat-chaise-napoleon': '/catalogue_images/12_chaise-napoleon.jpg',
  'mat-tente-32': '/catalogue_images/13_tente-de-reception-32m2-4x8m.jpg',
  'mat-tente-50': '/catalogue_images/14_tente-de-reception-50m2-5x10m.jpg',
  'mat-tente-72': '/catalogue_images/15_tente-de-reception-72m2-6x12m.jpg',
  'mat-tente-100': '/catalogue_images/16_tente-de-reception-100m2-5x20m.jpg',
  'mat-opt-kit-led': '/catalogue_images/17_kit-lumiere-led.jpg',
  'mat-opt-parasol': '/catalogue_images/18_parasol-chauffant-electrique.jpg',
  'mat-opt-rallonge-5': '/catalogue_images/19_rallonge-electrique-5m.jpg',
  'mat-opt-rallonge-10': '/catalogue_images/20_rallonge-electrique-10m.jpg',
  'mat-opt-poids-30': '/catalogue_images/22_poids-de-lestage-30kg.jpg',
  'mat-opt-galette': '/catalogue_images/23_option-galette-de-chaise.jpg',
};

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
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, 0, ?)`,
      args: [mat.id, mat.name, mat.description || null, mat.category, mat.max_quantity, mat.min_order_qty || null, mat.image_url || null, now],
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

export default db;

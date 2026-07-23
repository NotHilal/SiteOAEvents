import { createClient } from '@libsql/client';

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

  await client.executeMultiple(`
    CREATE INDEX IF NOT EXISTS idx_payments_reservation ON payments(reservation_id);
    CREATE INDEX IF NOT EXISTS idx_payments_due_status ON payments(due_date, status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_reference ON reservations(reference);
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
}

export default db;

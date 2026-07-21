import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'db.sqlite');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Create tables
db.exec(`
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
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn('materials', 'price', 'REAL DEFAULT 0');
ensureColumn('reservations', 'prenom', 'TEXT');
ensureColumn('reservations', 'nom', 'TEXT');
ensureColumn('reservations', 'delivery_address', 'TEXT');
ensureColumn('reservations', 'distance_km', 'REAL');
ensureColumn('reservations', 'delivery_fee', 'REAL');
ensureColumn('reservations', 'materials_total', 'REAL');
ensureColumn('reservations', 'grand_total', 'REAL');
ensureColumn('reservations', 'stripe_customer_id', 'TEXT');
ensureColumn('reservations', 'payment_method', 'TEXT'); // 'card' | 'virement'
ensureColumn('reservations', 'reference', 'TEXT'); // human-facing order number, e.g. OA-K7M2QX
ensureColumn('reservations', 'notified_status', 'TEXT'); // last status an email was sent for — avoids re-sending on repeat clicks
// Delivery rate actually used for this quote, captured at booking time —
// so the price breakdown shown later always matches what delivery_fee was
// computed from, even if the base fee/per-km rate in Réglages changes afterwards.
ensureColumn('reservations', 'quote_base_fee', 'REAL');
ensureColumn('reservations', 'quote_per_km', 'REAL');

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_payments_reservation ON payments(reservation_id);
  CREATE INDEX IF NOT EXISTS idx_payments_due_status ON payments(due_date, status);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_reference ON reservations(reference);
`);

// Alphabet avoids visually ambiguous characters (0/O, 1/I/L) since this
// code is meant to be read off an email and typed back on /suivi.
const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generateReservationReference() {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = 'OA-';
    for (let i = 0; i < 6; i++) {
      code += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
    }
    const exists = db.prepare('SELECT 1 FROM reservations WHERE reference = ?').get(code);
    if (!exists) return code;
  }
  throw new Error('Impossible de générer une référence unique');
}

// Seed default categories if empty
const catCount = db.prepare("SELECT COUNT(*) as count FROM categories").get().count;
if (catCount === 0) {
  const insertCat = db.prepare("INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)");
  const categories = [
    { id: 'c1', name: 'MOBILIER' },
    { id: 'c2', name: 'LINGE DE TABLE' },
    { id: 'c3', name: 'DÉCORATION' },
    { id: 'c4', name: 'ÉCLAIRAGE' }
  ];
  const now = new Date().toISOString();
  const transaction = db.transaction(() => {
    for (const cat of categories) {
      insertCat.run(cat.id, cat.name, now);
    }
  });
  transaction();
}

// Seed default materials if empty
const matCount = db.prepare("SELECT COUNT(*) as count FROM materials").get().count;
if (matCount === 0) {
  const insertMat = db.prepare(`
    INSERT INTO materials (id, name, description, category, max_quantity, available, image_url, created_at)
    VALUES (?, ?, ?, ?, ?, 1, NULL, ?)
  `);
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
    { id: '12', name: 'Projecteurs LED', description: 'Projecteurs RGB sur pied', category: 'ÉCLAIRAGE', max_quantity: 6 }
  ];
  const now = new Date().toISOString();
  const transaction = db.transaction(() => {
    for (const mat of materials) {
      insertMat.run(mat.id, mat.name, mat.description, mat.category, mat.max_quantity, now);
    }
  });
  transaction();
}

// Seed each setting key independently (INSERT OR IGNORE) rather than only
// when the whole table is empty — otherwise a key added later (like the
// bank_* ones) would never get inserted for a database that already has
// earlier settings rows in it, and every read/update against that key
// would silently no-op forever.
const insertSettingIfMissing = db.prepare('INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
const settingsNow = new Date().toISOString();
const settingDefaults = [
  ['depot_address', process.env.DEPOT_ADDRESS || '72 rue Victor Basch, 92120 Montrouge, France'],
  ['delivery_base_fee', process.env.DELIVERY_BASE_FEE || '15'],
  ['delivery_per_km', process.env.DELIVERY_PER_KM || '1.2'],
  ['bank_holder', ''],
  ['bank_iban', ''],
  ['bank_bic', ''],
];
const seedSettingsTx = db.transaction(() => {
  for (const [key, value] of settingDefaults) {
    insertSettingIfMissing.run(key, value, settingsNow);
  }
});
seedSettingsTx();

export default db;

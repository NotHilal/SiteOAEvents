// PostgreSQL schema, as ordered migrations. Applied once each, in order, at
// the first query of each server process (src/lib/db/index.js) and recorded
// in schema_migrations. Never edit a migration that has shipped: add a new
// one at the end.
//
// Kept as JS (not .sql files) so they are bundled with the server code —
// nothing to copy next to the Next.js standalone build.

export const MIGRATIONS = [
  {
    id: '001_init',
    sql: `
CREATE EXTENSION IF NOT EXISTS citext;

-- Catalogue ----------------------------------------------------------------
CREATE TABLE categories (
  id           text PRIMARY KEY,
  name         text NOT NULL UNIQUE,          -- key stored in materials.category (uppercase title)
  label        text,                          -- title shown on the /catalogue tile
  description  text,
  image_url    text,
  position     integer,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (                       -- "article à options": groups materials (variants)
  id           text PRIMARY KEY,
  slug         text NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text,
  category     text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE materials (                      -- one rentable item (or one option of a product)
  id             text PRIMARY KEY,
  name           text NOT NULL,
  description    text,
  category       text,
  max_quantity   integer NOT NULL DEFAULT 1,  -- units owned
  available      boolean NOT NULL DEFAULT true,  -- online on the public site
  image_url      text,
  gallery        jsonb NOT NULL DEFAULT '[]',
  price          double precision NOT NULL DEFAULT 0,  -- legacy, prices live in material_price_tiers
  min_order_qty  integer,
  slug           text UNIQUE,
  product_id     text REFERENCES products(id) ON DELETE SET NULL,
  variant_label  text,
  variant_order  integer,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX materials_product_idx ON materials(product_id);

CREATE TABLE material_price_tiers (           -- HT prices; TTC = HT × 1.2 (src/lib/pricing.js)
  id                text PRIMARY KEY,
  material_id       text NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  min_qty           integer NOT NULL DEFAULT 1,
  max_qty           integer,
  price_weekday_ht  double precision NOT NULL DEFAULT 0,
  price_weekend_ht  double precision NOT NULL DEFAULT 0,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX material_price_tiers_material_idx ON material_price_tiers(material_id);

CREATE TABLE stock_movements (                -- history of manual stock changes (kept if the item is deleted)
  id           text PRIMARY KEY,
  material_id  text NOT NULL,
  delta        integer NOT NULL,
  stock_after  integer NOT NULL,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_material_idx ON stock_movements(material_id, created_at DESC);

-- Customers ----------------------------------------------------------------
CREATE TABLE customer_accounts (
  id               text PRIMARY KEY,
  email            citext NOT NULL UNIQUE,
  password_hash    text NOT NULL,
  first_name       text NOT NULL,
  last_name        text NOT NULL,
  phone            text,
  civility         text,
  account_type     text NOT NULL DEFAULT 'particulier',
  company_name     text,
  active           boolean NOT NULL DEFAULT true,
  session_version  integer NOT NULL DEFAULT 0,
  last_login_at    timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_accounts_created_idx ON customer_accounts(created_at);

CREATE TABLE customer_password_resets (
  id                      text PRIMARY KEY,
  account_id              text NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
  token_hash              text NOT NULL UNIQUE,
  session_version         integer NOT NULL,
  expires_at              timestamptz NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  used_at                 timestamptz,
  sent_at                 timestamptz,
  changed_notice_sent_at  timestamptz,
  last_error              text
);
CREATE INDEX customer_password_resets_account_idx ON customer_password_resets(account_id, created_at);

CREATE TABLE customer_welcome_emails (
  account_id  text PRIMARY KEY REFERENCES customer_accounts(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz,
  last_error  text
);

-- Orders, manual orders and stock blocks (order_kind rental | manual | block) --
CREATE TABLE reservations (
  id                    text PRIMARY KEY,
  reference             text UNIQUE,                 -- e.g. OA-K7M2QX
  order_kind            text,                        -- rental (paid online) | manual | block | NULL (legacy request)
  status                text NOT NULL DEFAULT 'pending',
  email                 text NOT NULL DEFAULT '',
  phone                 text,
  prenom                text,
  nom                   text,
  title                 text,
  notes                 text,
  date                  date NOT NULL,               -- first day
  dates                 jsonb NOT NULL DEFAULT '[]', -- every rental day, YYYY-MM-DD
  materials             jsonb NOT NULL DEFAULT '[]', -- [{ id, name, quantity, price }]
  rental_hours          jsonb NOT NULL DEFAULT '[]',
  event_type            text,
  nb_persons            integer,
  message               text,
  delivery_address      text,
  distance_km           double precision,
  delivery_fee          double precision,
  quote_base_fee        double precision,
  quote_per_km          double precision,
  materials_total       double precision,
  grand_total           double precision,
  payment_method        text,
  payment_status        text,                        -- manual orders: unpaid | deposit | paid
  amount_paid           double precision,
  stripe_customer_id    text,
  account_id            text REFERENCES customer_accounts(id) ON DELETE SET NULL,
  checkout_key          text UNIQUE,
  checkout_fingerprint  text,
  expires_at            timestamptz,
  payment_lock          text,
  payment_lock_until    timestamptz,
  notified_status       text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz
);
CREATE INDEX reservations_status_idx ON reservations(status, date);
CREATE INDEX reservations_account_idx ON reservations(account_id, created_at);

CREATE TABLE payments (
  id                        text PRIMARY KEY,
  reservation_id            text NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  stripe_payment_intent_id  text UNIQUE,
  method                    text NOT NULL DEFAULT 'stripe',
  amount                    double precision NOT NULL,
  installment_index         integer NOT NULL DEFAULT 0,
  installment_label         text,
  due_date                  date,
  status                    text NOT NULL DEFAULT 'pending',
  failure_message           text,
  paid_at                   timestamptz,
  refund_id                 text,
  refunded_at               timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_reservation_idx ON payments(reservation_id);

CREATE TABLE order_emails (                   -- outbox: an e-mail failure never rolls back an order
  id          text PRIMARY KEY,
  recipient   text NOT NULL,
  subject     text NOT NULL,
  html        text NOT NULL,
  sent_at     timestamptz,
  last_error  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Availability -------------------------------------------------------------
CREATE TABLE blocked_dates (                  -- days closed to online orders
  id          text PRIMARY KEY,
  date        date NOT NULL UNIQUE,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE blocked_hours (                  -- legacy, read by the checkout
  id          text PRIMARY KEY,
  date        date NOT NULL,
  hour        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Messages, settings, content, files ---------------------------------------
CREATE TABLE contacts (
  id              text PRIMARY KEY,
  prenom          text,
  nom             text,
  name            text,
  email           text NOT NULL,
  telephone       text,
  phone           text,
  type_evenement  text,
  subject         text,
  message         text NOT NULL,
  read            boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE settings (                       -- business configuration, admin only (secrets are encrypted)
  key         text PRIMARY KEY,
  value       text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE site_content (                   -- public page content (JSON or plain text)
  key         text PRIMARY KEY,
  value       text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE files (                          -- uploaded photos / videos, served at /uploads/<path>
  path        text PRIMARY KEY,
  mime        text NOT NULL,
  data        bytea NOT NULL,
  size        integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
`,
  },
]

-- =====================================================
-- OA Événementiel — Supabase Setup
-- Coller dans : Supabase Dashboard → SQL Editor → Run
-- =====================================================

-- 1. TABLE MATÉRIAUX
create table if not exists materials (
  id           uuid default gen_random_uuid() primary key,
  name         text not null,
  description  text,
  category     text,
  max_quantity integer not null default 1,
  available    boolean default true,
  created_at   timestamp with time zone default now()
);

-- 2. TABLE RÉSERVATIONS
create table if not exists reservations (
  id          uuid default gen_random_uuid() primary key,
  email       text not null,
  phone       text,
  date        date not null,
  event_type  text not null,
  nb_persons  integer,
  materials   jsonb default '[]',
  message     text,
  status      text default 'pending' check (status in ('pending','confirmed','refused')),
  created_at  timestamp with time zone default now()
);

-- 3. TABLE DATES BLOQUÉES
create table if not exists blocked_dates (
  id         uuid default gen_random_uuid() primary key,
  date       date not null unique,
  reason     text,
  created_at timestamp with time zone default now()
);

-- 4. SÉCURITÉ (RLS)
alter table materials     enable row level security;
alter table reservations  enable row level security;
alter table blocked_dates enable row level security;

-- Matériaux : lecture publique, écriture admin seulement
create policy "public_read_materials"  on materials     for select using (true);
create policy "auth_write_materials"   on materials     for all    using (auth.role() = 'authenticated');

-- Réservations : insertion publique, lecture/modif admin
create policy "public_insert_reservations" on reservations for insert with check (true);
create policy "auth_read_reservations"     on reservations for select using (auth.role() = 'authenticated');
create policy "auth_update_reservations"   on reservations for update using (auth.role() = 'authenticated');
create policy "auth_delete_reservations"   on reservations for delete using (auth.role() = 'authenticated');

-- Dates bloquées : lecture publique, écriture admin
create policy "public_read_blocked"  on blocked_dates for select using (true);
create policy "auth_write_blocked"   on blocked_dates for all    using (auth.role() = 'authenticated');

-- 5. MATÉRIAUX PAR DÉFAUT
insert into materials (name, description, category, max_quantity) values
  ('Chaises Chiavari',        'Chaises élégantes dorées ou blanches',   'Mobilier',       50),
  ('Tables rondes (Ø150cm)', 'Tables pour 8-10 personnes',             'Mobilier',       10),
  ('Tables rectangulaires',   'Tables banquet 180×75 cm',              'Mobilier',        8),
  ('Nappes blanches',         'Nappes satin blanc',                     'Linge de table', 30),
  ('Nappes rose gold',        'Nappes satin rose gold',                 'Linge de table', 20),
  ('Chemin de table',         'Chemin de table organza',                'Linge de table', 25),
  ('Arche florale',           'Arche décorée de fleurs',               'Décoration',      2),
  ('Photobooth',              'Structure photobooth avec fond',         'Décoration',      1),
  ('Vases cylindriques',      'Vases en verre transparent',            'Décoration',     30),
  ('Bougies LED',             'Bougies à flamme réaliste',             'Éclairage',      60),
  ('Guirlandes lumineuses',   'Guirlandes 10 m, blanc chaud',         'Éclairage',      10),
  ('Projecteurs LED',         'Projecteurs RGB sur pied',              'Éclairage',       6)
on conflict do nothing;

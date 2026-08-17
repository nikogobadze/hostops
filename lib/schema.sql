-- ============================================================
--  Magnolia House — HostOps schema (libSQL / SQLite)
--
--  Conventions
--    · ids are text, generated in the app, so a row can be built
--      before it is written and referenced without a round trip
--    · dates that describe a calendar day are TEXT 'YYYY-MM-DD';
--      moments in time are TEXT ISO-8601 UTC. Nothing is stored as
--      a unix integer, so the SQL reads the same as the app does
--    · booleans are INTEGER 0/1, SQLite has no boolean type
--    · anything list-shaped is JSON text, and only ever read whole
-- ============================================================

-- ---------- people ------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  phone         TEXT,
  country       TEXT,
  -- guest  : books rooms, sees only their own reservations
  -- staff  : front desk, housekeeping, service boards
  -- manager: everything, including rates, rooms and channels
  role          TEXT NOT NULL DEFAULT 'guest'
                CHECK (role IN ('guest', 'staff', 'manager')),
  guest_id      TEXT,                    -- links an account to its guest profile
  active        INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,           -- the opaque cookie value
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions (expires_at);

-- A guest profile is not an account: OTA and walk-in guests have a
-- profile and no login, and one account may map to one profile.
CREATE TABLE IF NOT EXISTS guests (
  id              TEXT PRIMARY KEY,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT COLLATE NOCASE,
  phone           TEXT,
  country         TEXT,
  vip             INTEGER NOT NULL DEFAULT 0,
  doc_type        TEXT,
  doc_id          TEXT,
  prefs           TEXT,
  notes           TEXT,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests (email);
CREATE INDEX IF NOT EXISTS idx_guests_name ON guests (last_name, first_name);

CREATE TABLE IF NOT EXISTS staff (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL
);

-- ---------- the property ------------------------------------

CREATE TABLE IF NOT EXISTS hotel (
  id              INTEGER PRIMARY KEY CHECK (id = 1),   -- single row
  name            TEXT NOT NULL,
  tagline         TEXT,
  address         TEXT,
  email           TEXT,
  phone           TEXT,
  currency        TEXT NOT NULL DEFAULT 'GEL',
  tax_rate        REAL NOT NULL DEFAULT 18,
  city_tax        REAL NOT NULL DEFAULT 0,
  check_in_time   TEXT NOT NULL DEFAULT '15:00',
  check_out_time  TEXT NOT NULL DEFAULT '11:00',
  breakfast_price REAL NOT NULL DEFAULT 45,
  updated_at      TEXT
);

CREATE TABLE IF NOT EXISTS room_types (
  id         TEXT PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  base_price REAL NOT NULL,
  capacity   INTEGER NOT NULL,
  beds       TEXT,
  size       INTEGER,
  amenities  TEXT,        -- json array
  art        TEXT,
  view       TEXT,
  blurb      TEXT,
  highlights TEXT,        -- json array
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rooms (
  id         TEXT PRIMARY KEY,
  number     TEXT NOT NULL UNIQUE,
  floor      INTEGER NOT NULL,
  type_id    TEXT NOT NULL REFERENCES room_types (id),
  status     TEXT NOT NULL DEFAULT 'clean'
             CHECK (status IN ('clean', 'inspected', 'dirty', 'cleaning', 'ooo')),
  notes      TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  ooo_from   TEXT,
  ooo_to     TEXT,
  ooo_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms (type_id);

-- ---------- reservations ------------------------------------

CREATE TABLE IF NOT EXISTS bookings (
  id             TEXT PRIMARY KEY,
  ref            TEXT NOT NULL UNIQUE,
  guest_id       TEXT REFERENCES guests (id),
  user_id        TEXT REFERENCES users (id),   -- set when booked while signed in
  room_id        TEXT REFERENCES rooms (id),
  type_id        TEXT REFERENCES room_types (id),
  check_in       TEXT NOT NULL,                -- YYYY-MM-DD, inclusive
  check_out      TEXT NOT NULL,                -- YYYY-MM-DD, exclusive
  adults         INTEGER NOT NULL DEFAULT 1,
  children       INTEGER NOT NULL DEFAULT 0,
  rate           REAL NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'confirmed'
                 CHECK (status IN ('confirmed', 'in_house', 'checked_out', 'cancelled', 'no_show')),
  channel        TEXT NOT NULL DEFAULT 'direct'
                 CHECK (channel IN ('direct', 'booking', 'airbnb')),
  channel_ref    TEXT,
  breakfast      INTEGER NOT NULL DEFAULT 0,
  notes          TEXT,
  payment_status TEXT NOT NULL DEFAULT 'guaranteed',
  created_at     TEXT NOT NULL,
  checked_in_at  TEXT,
  checked_out_at TEXT,
  cancelled_at   TEXT,
  cancel_reason  TEXT
);
-- the availability query filters on room + overlapping dates, constantly
CREATE INDEX IF NOT EXISTS idx_bookings_room_dates ON bookings (room_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings (check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_guest ON bookings (guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id);

CREATE TABLE IF NOT EXISTS folio_items (
  id         TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  ts         TEXT NOT NULL,
  type       TEXT NOT NULL,   -- room | fnb | service | minibar | payment | other
  descr      TEXT NOT NULL,
  qty        REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  amount     REAL NOT NULL DEFAULT 0,
  source_id  TEXT
);
CREATE INDEX IF NOT EXISTS idx_folio_booking ON folio_items (booking_id);

CREATE TABLE IF NOT EXISTS folios (
  booking_id TEXT PRIMARY KEY REFERENCES bookings (id) ON DELETE CASCADE,
  closed     INTEGER NOT NULL DEFAULT 0,
  closed_at  TEXT
);

-- ---------- housekeeping ------------------------------------

CREATE TABLE IF NOT EXISTS hk_tasks (
  id           TEXT PRIMARY KEY,
  room_id      TEXT NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  date         TEXT NOT NULL,
  type         TEXT NOT NULL,
  assignee     TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'in_progress', 'done')),
  priority     TEXT NOT NULL DEFAULT 'normal',
  notes        TEXT,
  minutes      INTEGER NOT NULL DEFAULT 30,
  started_at   TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_hk_date ON hk_tasks (date, status);

-- ---------- room service ------------------------------------

CREATE TABLE IF NOT EXISTS menu_items (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  category  TEXT NOT NULL,
  price     REAL NOT NULL,
  prep_mins INTEGER NOT NULL DEFAULT 15,
  active    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  ref             TEXT NOT NULL,
  room_id         TEXT REFERENCES rooms (id),
  booking_id      TEXT REFERENCES bookings (id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'preparing', 'delivered', 'cancelled')),
  placed_at       TEXT NOT NULL,
  delivered_at    TEXT,
  assignee        TEXT,
  notes           TEXT,
  posted_to_folio INTEGER NOT NULL DEFAULT 0,
  total           REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status, placed_at);

CREATE TABLE IF NOT EXISTS order_lines (
  id       TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  menu_id  TEXT NOT NULL REFERENCES menu_items (id),
  qty      INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_order_lines_order ON order_lines (order_id);

-- ---------- mini bar ----------------------------------------

CREATE TABLE IF NOT EXISTS minibar_items (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  price REAL NOT NULL,
  cost  REAL NOT NULL DEFAULT 0,
  par   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS minibar_stock (
  room_id TEXT NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES minibar_items (id) ON DELETE CASCADE,
  qty     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (room_id, item_id)
);

CREATE TABLE IF NOT EXISTS minibar_postings (
  id         TEXT PRIMARY KEY,
  room_id    TEXT NOT NULL REFERENCES rooms (id),
  booking_id TEXT REFERENCES bookings (id) ON DELETE SET NULL,
  item_id    TEXT NOT NULL REFERENCES minibar_items (id),
  qty        INTEGER NOT NULL,
  amount     REAL NOT NULL,
  ts         TEXT NOT NULL,
  posted_by  TEXT,
  voided     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_minibar_room ON minibar_postings (room_id, ts);

-- ---------- what else the hotel sells -----------------------

CREATE TABLE IF NOT EXISTS restaurants (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  tagline        TEXT,
  cuisine        TEXT,
  art            TEXT,
  descr          TEXT,
  dress_code     TEXT,
  price_range    TEXT,
  avg_per_person REAL,
  location       TEXT,
  hours          TEXT,
  slots          TEXT,   -- json array of 'HH:MM'
  seats_per_slot INTEGER NOT NULL DEFAULT 20,
  closed_days    TEXT,   -- json array of JS day numbers
  highlights     TEXT,   -- json array
  signature      TEXT,   -- json array of { name, price }
  sort_order     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dining_reservations (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants (id),
  booking_id    TEXT REFERENCES bookings (id) ON DELETE SET NULL,
  guest_id      TEXT REFERENCES guests (id),
  user_id       TEXT REFERENCES users (id),
  guest_name    TEXT,
  email         TEXT,
  phone         TEXT,
  date          TEXT NOT NULL,
  time          TEXT NOT NULL,
  party         INTEGER NOT NULL DEFAULT 2,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'confirmed',
  source        TEXT NOT NULL DEFAULT 'site',
  created_at    TEXT NOT NULL,
  cancelled_at  TEXT
);
-- the seats-taken query hits this on every slot render
CREATE INDEX IF NOT EXISTS idx_dining_slot ON dining_reservations (restaurant_id, date, time, status);

CREATE TABLE IF NOT EXISTS spa (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  name            TEXT NOT NULL,
  tagline         TEXT,
  descr           TEXT,
  art             TEXT,
  hours           TEXT,
  rooms_available INTEGER NOT NULL DEFAULT 4,
  slots           TEXT,   -- json array
  facilities      TEXT    -- json array
);

CREATE TABLE IF NOT EXISTS spa_treatments (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL,
  duration   INTEGER NOT NULL,
  price      REAL NOT NULL,
  descr      TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS spa_bookings (
  id           TEXT PRIMARY KEY,
  treatment_id TEXT NOT NULL REFERENCES spa_treatments (id),
  booking_id   TEXT REFERENCES bookings (id) ON DELETE SET NULL,
  guest_id     TEXT REFERENCES guests (id),
  user_id      TEXT REFERENCES users (id),
  guest_name   TEXT,
  email        TEXT,
  date         TEXT NOT NULL,
  time         TEXT NOT NULL,
  guests       INTEGER NOT NULL DEFAULT 1,
  notes        TEXT,
  status       TEXT NOT NULL DEFAULT 'confirmed',
  source       TEXT NOT NULL DEFAULT 'site',
  created_at   TEXT NOT NULL,
  cancelled_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_spa_slot ON spa_bookings (date, time, status);

CREATE TABLE IF NOT EXISTS experiences (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  art        TEXT,
  category   TEXT,
  duration   INTEGER NOT NULL,
  price      REAL NOT NULL,
  capacity   INTEGER NOT NULL,
  days       TEXT,   -- json array of JS day numbers
  time       TEXT,
  meeting    TEXT,
  summary    TEXT,
  descr      TEXT,
  includes   TEXT,   -- json array
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS experience_bookings (
  id            TEXT PRIMARY KEY,
  experience_id TEXT NOT NULL REFERENCES experiences (id),
  booking_id    TEXT REFERENCES bookings (id) ON DELETE SET NULL,
  guest_id      TEXT REFERENCES guests (id),
  user_id       TEXT REFERENCES users (id),
  guest_name    TEXT,
  email         TEXT,
  date          TEXT NOT NULL,
  people        INTEGER NOT NULL DEFAULT 1,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'confirmed',
  source        TEXT NOT NULL DEFAULT 'site',
  created_at    TEXT NOT NULL,
  cancelled_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_exp_date ON experience_bookings (experience_id, date, status);

-- ---------- distribution & audit ----------------------------

CREATE TABLE IF NOT EXISTS channels (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  connected         INTEGER NOT NULL DEFAULT 0,
  api_key           TEXT,
  property_id       TEXT,
  endpoint          TEXT,
  commission_pct    REAL NOT NULL DEFAULT 0,
  auto_sync         INTEGER NOT NULL DEFAULT 0,
  sync_interval_min INTEGER NOT NULL DEFAULT 15,
  pull_reservations INTEGER NOT NULL DEFAULT 1,
  push_availability INTEGER NOT NULL DEFAULT 1,
  push_rates        INTEGER NOT NULL DEFAULT 1,
  last_sync         TEXT,
  health            TEXT DEFAULT 'ok'
);

CREATE TABLE IF NOT EXISTS sync_log (
  id        TEXT PRIMARY KEY,
  ts        TEXT NOT NULL,
  channel   TEXT NOT NULL,
  level     TEXT NOT NULL,
  message   TEXT NOT NULL,
  direction TEXT
);
CREATE INDEX IF NOT EXISTS idx_synclog_ts ON sync_log (ts DESC);

CREATE TABLE IF NOT EXISTS activity (
  id      TEXT PRIMARY KEY,
  ts      TEXT NOT NULL,
  type    TEXT,
  icon    TEXT,
  text    TEXT NOT NULL,
  link    TEXT,
  user_id TEXT REFERENCES users (id)
);
CREATE INDEX IF NOT EXISTS idx_activity_ts ON activity (ts DESC);

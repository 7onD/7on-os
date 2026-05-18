-- 7on OS — D1 schema
-- Запусти в: Cloudflare → D1 → твоя база → Console → Execute

CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  due         TEXT DEFAULT '',
  priority    TEXT DEFAULT 'med',
  type        TEXT DEFAULT 'personal',
  tag         TEXT,
  done        INTEGER DEFAULT 0,
  description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS contacts (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT DEFAULT '',
  addr         TEXT DEFAULT '',
  params       TEXT DEFAULT '',
  last_contact TEXT DEFAULT '',
  days_since   INTEGER DEFAULT 0,
  status       TEXT DEFAULT 'work',
  next         TEXT DEFAULT '',
  next_when    TEXT DEFAULT '',
  notes        TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS deals (
  id         TEXT PRIMARY KEY,
  client     TEXT DEFAULT '',
  object     TEXT DEFAULT '',
  stage      TEXT DEFAULT '',
  amount     REAL DEFAULT 0,
  commission REAL DEFAULT 0,
  expected   TEXT DEFAULT '',
  step       INTEGER DEFAULT 1,
  total      INTEGER DEFAULT 5
);

CREATE TABLE IF NOT EXISTS fin_income (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name   TEXT DEFAULT '',
  amount REAL DEFAULT 0,
  pct    REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fin_expenses (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name   TEXT DEFAULT '',
  amount REAL DEFAULT 0,
  pct    REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS goals (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT DEFAULT '',
  target  REAL DEFAULT 0,
  current REAL DEFAULT 0,
  pct     INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS monthly (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  month      TEXT DEFAULT '',
  income     REAL DEFAULT 0,
  expenses   REAL DEFAULT 0,
  is_current INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT DEFAULT '',
  day         INTEGER DEFAULT 1,
  start_time  REAL DEFAULT 9,
  end_time    REAL DEFAULT 10,
  kind        TEXT DEFAULT 'work',
  description TEXT DEFAULT ''
);

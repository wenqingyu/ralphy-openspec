-- ralphy-spec v2 schema (SQLite)

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  repo_root TEXT NOT NULL,
  backend_id TEXT,
  workspace_mode TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  status TEXT NOT NULL,
  phase TEXT,
  iteration INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  finished_at TEXT,
  last_error TEXT,
  PRIMARY KEY (run_id, task_id)
);

CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  task_id TEXT,
  ts TEXT NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  data_json TEXT
);

CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  signature TEXT,
  kind TEXT NOT NULL,
  file TEXT,
  line INTEGER,
  message TEXT NOT NULL,
  raw_json TEXT,
  ts TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  ref TEXT NOT NULL,
  message TEXT NOT NULL
);


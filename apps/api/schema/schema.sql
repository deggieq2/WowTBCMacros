CREATE TABLE IF NOT EXISTS macros (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  class TEXT NOT NULL,
  tags TEXT NOT NULL,
  macro_text TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  macro_id TEXT NOT NULL,
  voter_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(macro_id) REFERENCES macros(id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  macro_id TEXT NOT NULL,
  submitter_meta TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(macro_id) REFERENCES macros(id)
);

CREATE INDEX IF NOT EXISTS idx_macros_status ON macros(status);
CREATE INDEX IF NOT EXISTS idx_votes_macro ON votes(macro_id);

-- Full-text search table
CREATE VIRTUAL TABLE IF NOT EXISTS macros_fts USING fts5(
  id,
  title,
  class,
  tags,
  description,
  macro_text
);

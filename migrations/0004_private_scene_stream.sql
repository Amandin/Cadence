PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS scene_streams (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  scene_id TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  view_json TEXT,
  config_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS scene_streams_owner_active_idx
ON scene_streams(owner_id, revoked_at, created_at DESC);

CREATE TABLE IF NOT EXISTS scene_stream_indicators (
  stream_id TEXT NOT NULL REFERENCES scene_streams(id) ON DELETE CASCADE,
  scene_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  indicator_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  value_json TEXT NOT NULL,
  owner_value_json TEXT NOT NULL,
  definition_hash TEXT NOT NULL,
  writable INTEGER NOT NULL DEFAULT 0 CHECK (writable IN (0, 1)),
  pending INTEGER NOT NULL DEFAULT 0 CHECK (pending IN (0, 1)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (stream_id, scene_id, participant_id, indicator_id)
);

CREATE INDEX IF NOT EXISTS scene_stream_indicators_pending_idx
ON scene_stream_indicators(stream_id, scene_id, pending);

CREATE TRIGGER IF NOT EXISTS scene_stream_indicator_value_revision
AFTER UPDATE OF value_json ON scene_stream_indicators
WHEN NEW.value_json IS NOT OLD.value_json
BEGIN
  UPDATE scene_streams
  SET revision = revision + 1, updated_at = NEW.updated_at
  WHERE id = NEW.stream_id AND revoked_at IS NULL;
END;

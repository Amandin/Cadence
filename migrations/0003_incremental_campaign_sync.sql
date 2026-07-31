ALTER TABLE campaigns ADD COLUMN content_hash TEXT;
ALTER TABLE campaigns ADD COLUMN base_revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE campaigns ADD COLUMN payload_bytes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN patch_count INTEGER NOT NULL DEFAULT 0;

UPDATE campaigns
SET base_revision = revision,
    payload_bytes = length(CAST(payload AS BLOB)),
    patch_count = 0;

CREATE TABLE IF NOT EXISTS campaign_patches (
  user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  patch TEXT NOT NULL,
  result_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, revision)
);

CREATE INDEX IF NOT EXISTS campaign_patches_user_revision_idx
ON campaign_patches(user_id, revision);

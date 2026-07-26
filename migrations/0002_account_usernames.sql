ALTER TABLE accounts ADD COLUMN username TEXT;

UPDATE accounts
SET username = lower(email)
WHERE username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS accounts_username_idx
ON accounts(username COLLATE NOCASE);

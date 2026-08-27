-- The hash remains the lookup key for anonymous guests.  The original token is
-- retained only so its authenticated owner can recover the same private URL on
-- another device.
ALTER TABLE scene_streams ADD COLUMN share_token TEXT;

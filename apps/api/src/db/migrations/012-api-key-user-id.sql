-- Per-user API key overrides.
-- user_id IS NULL  -> organization default (set by admins)
-- user_id IS NOT NULL -> personal override for that user, takes precedence over org default
ALTER TABLE api_keys ADD COLUMN user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_api_keys_lookup ON api_keys (org_id, user_id, provider, priority);

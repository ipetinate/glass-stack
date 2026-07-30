CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    username_normalized TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    password_changed_at TEXT NOT NULL,
    last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash BLOB PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_hash BLOB NOT NULL,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    idle_expires_at TEXT NOT NULL,
    absolute_expires_at TEXT NOT NULL,
    revoked_at TEXT,
    mfa_verified_at TEXT
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(absolute_expires_at);

CREATE TABLE IF NOT EXISTS bootstrap_tokens (
    token_hash BLOB PRIMARY KEY,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    consumed_at TEXT
);

CREATE TABLE IF NOT EXISTS auth_challenges (
    token_hash BLOB PRIMARY KEY,
    purpose TEXT NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    consumed_at TEXT
);

CREATE TABLE IF NOT EXISTS invitations (
    token_hash BLOB PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'viewer')),
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash BLOB PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT
);

CREATE TABLE IF NOT EXISTS totp_credentials (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    secret_ciphertext BLOB NOT NULL,
    nonce BLOB NOT NULL,
    last_counter INTEGER NOT NULL DEFAULT -1,
    enabled_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash BLOB NOT NULL,
    used_at TEXT,
    PRIMARY KEY (user_id, code_hash)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL DEFAULT 1,
    preferences_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('wallpaper', 'avatar')),
    storage_path TEXT,
    media_type TEXT,
    byte_size INTEGER,
    width INTEGER,
    height INTEGER,
    sha256 TEXT,
    created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS media_assets_sha256_idx
    ON media_assets(sha256) WHERE sha256 IS NOT NULL;

CREATE TABLE IF NOT EXISTS wallpapers (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    media_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
    source TEXT NOT NULL CHECK (source IN ('preset', 'solid', 'gradient', 'unsplash', 'upload')),
    provider_id TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    author_name TEXT,
    author_url TEXT,
    source_url TEXT,
    download_location TEXT,
    license_name TEXT,
    license_url TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target TEXT,
    result TEXT NOT NULL,
    request_id TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON audit_events(created_at);

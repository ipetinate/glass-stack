ALTER TABLE store_apps ADD COLUMN compose_yaml TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS app_instances (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL UNIQUE REFERENCES store_apps(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('installing', 'installed', 'error')),
    compose_hash TEXT NOT NULL,
    last_error TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_operations (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES store_apps(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('install', 'uninstall')),
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    message TEXT NOT NULL DEFAULT '',
    payload_json TEXT NOT NULL DEFAULT '{}',
    result_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    completed_at TEXT
);
CREATE INDEX IF NOT EXISTS app_operations_app_id_idx ON app_operations(app_id);
CREATE INDEX IF NOT EXISTS app_operations_created_at_idx ON app_operations(created_at);
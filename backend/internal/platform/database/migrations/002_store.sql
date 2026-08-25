CREATE TABLE IF NOT EXISTS store_apps (
    id TEXT PRIMARY KEY,
    summary_json TEXT NOT NULL,
    detail_json TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '',
    content_hash TEXT NOT NULL,
    synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS store_sync_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    commit_sha TEXT NOT NULL DEFAULT '',
    synced_at TEXT NOT NULL DEFAULT ''
);

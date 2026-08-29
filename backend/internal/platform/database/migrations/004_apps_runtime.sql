ALTER TABLE app_instances ADD COLUMN options_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE app_instances ADD COLUMN installed_version TEXT NOT NULL DEFAULT '';
ALTER TABLE app_instances ADD COLUMN runtime_status TEXT NOT NULL DEFAULT '';

CREATE TABLE app_operations_new (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES store_apps(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('install', 'update', 'edit', 'remove', 'uninstall')),
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    message TEXT NOT NULL DEFAULT '',
    payload_json TEXT NOT NULL DEFAULT '{}',
    result_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    completed_at TEXT
);

INSERT INTO app_operations_new (
    id, app_id, kind, status, progress, message, payload_json, result_json,
    created_at, completed_at
)
SELECT id, app_id, kind, status, progress, message, payload_json, result_json,
    created_at, completed_at
FROM app_operations;

DROP TABLE app_operations;

ALTER TABLE app_operations_new RENAME TO app_operations;

CREATE INDEX app_operations_app_id_idx ON app_operations(app_id);
CREATE INDEX app_operations_created_at_idx ON app_operations(created_at);

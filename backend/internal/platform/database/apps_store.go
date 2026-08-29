package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/apps"
)

// AppsStore is the SQLite-backed persistence for app operations and
// instances (migration 003_apps.sql).
type AppsStore struct {
	db *Database
}

func NewAppsStore(db *Database) *AppsStore {
	return &AppsStore{db: db}
}

func (s *AppsStore) CreateOperation(ctx context.Context, operation apps.Operation) error {
	payload, err := json.Marshal(map[string]any{
		"message": operation.Message,
		"error":   operation.Error,
	})
	if err != nil {
		return fmt.Errorf("encode operation payload: %w", err)
	}
	_, err = s.db.SQL().ExecContext(ctx, `
		INSERT INTO app_operations (
			id, app_id, kind, status, progress, message, payload_json, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, operation.ID, operation.AppID, operation.Kind, string(operation.Status),
		operation.Progress, operation.Message, string(payload),
		operation.CreatedAt.Format(time.RFC3339Nano))
	if err != nil {
		return fmt.Errorf("create app operation: %w", err)
	}
	return nil
}

func (s *AppsStore) UpdateOperation(ctx context.Context, operation apps.Operation) error {
	resultJSON, err := json.Marshal(map[string]any{
		"message": operation.Message,
		"error":   operation.Error,
	})
	if err != nil {
		return fmt.Errorf("encode operation result: %w", err)
	}
	completedAt := sql.NullString{}
	if operation.CompletedAt != nil {
		completedAt.String = operation.CompletedAt.Format(time.RFC3339Nano)
		completedAt.Valid = true
	}
	result, err := s.db.SQL().ExecContext(ctx, `
		UPDATE app_operations SET
			status = ?, progress = ?, message = ?, result_json = ?, completed_at = ?
		WHERE id = ? AND status NOT IN ('succeeded', 'failed')
	`, string(operation.Status), operation.Progress, operation.Message,
		string(resultJSON), completedAt, operation.ID)
	if err != nil {
		return fmt.Errorf("update app operation: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return apps.ErrNotFound
	}
	return nil
}

func (s *AppsStore) LoadOperation(ctx context.Context, id string) (apps.Operation, error) {
	var (
		operation   apps.Operation
		status      string
		resultJSON  string
		createdAt   string
		completedAt sql.NullString
	)
	err := s.db.SQL().QueryRowContext(ctx, `
		SELECT id, app_id, kind, status, progress, message, result_json, created_at, completed_at
		FROM app_operations
		WHERE id = ?
	`, id).Scan(
		&operation.ID, &operation.AppID, &operation.Kind, &status, &operation.Progress,
		&operation.Message, &resultJSON, &createdAt, &completedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return apps.Operation{}, apps.ErrNotFound
	}
	if err != nil {
		return apps.Operation{}, fmt.Errorf("load app operation: %w", err)
	}
	operation.Status = apps.OperationStatus(status)
	if parsed, parseErr := time.Parse(time.RFC3339Nano, createdAt); parseErr == nil {
		operation.CreatedAt = parsed
	}
	if completedAt.Valid {
		if parsed, parseErr := time.Parse(time.RFC3339Nano, completedAt.String); parseErr == nil {
			operation.CompletedAt = &parsed
		}
	}
	var result struct {
		Error string `json:"error"`
	}
	if jsonErr := json.Unmarshal([]byte(resultJSON), &result); jsonErr == nil {
		operation.Error = result.Error
	}
	return operation, nil
}

func (s *AppsStore) UpsertInstance(ctx context.Context, instance apps.Instance) error {
	optionsJSON, err := json.Marshal(instance.Options)
	if err != nil {
		return fmt.Errorf("encode instance options: %w", err)
	}
	_, err = s.db.SQL().ExecContext(ctx, `
		INSERT INTO app_instances (
			id, app_id, status, compose_hash, last_error, options_json,
			installed_version, runtime_status, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(app_id) DO UPDATE SET
			status = excluded.status,
			compose_hash = excluded.compose_hash,
			last_error = excluded.last_error,
			options_json = excluded.options_json,
			installed_version = excluded.installed_version,
			runtime_status = excluded.runtime_status,
			updated_at = excluded.updated_at
	`, instance.ID, instance.AppID, string(instance.Status), instance.ComposeHash,
		instance.LastError, string(optionsJSON), instance.Version, string(instance.Runtime),
		instance.CreatedAt.Format(time.RFC3339Nano),
		instance.UpdatedAt.Format(time.RFC3339Nano))
	if err != nil {
		return fmt.Errorf("upsert app instance: %w", err)
	}
	return nil
}

func (s *AppsStore) LoadInstance(ctx context.Context, appID string) (apps.Instance, error) {
	var (
		instance    apps.Instance
		status      string
		optionsJSON string
		runtime     string
		createdAt   string
		updatedAt   string
	)
	err := s.db.SQL().QueryRowContext(ctx, `
		SELECT id, app_id, status, compose_hash, last_error, options_json,
			installed_version, runtime_status, created_at, updated_at
		FROM app_instances
		WHERE app_id = ?
	`, appID).Scan(
		&instance.ID, &instance.AppID, &status, &instance.ComposeHash,
		&instance.LastError, &optionsJSON, &instance.Version, &runtime,
		&createdAt, &updatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return apps.Instance{}, apps.ErrNotFound
	}
	if err != nil {
		return apps.Instance{}, fmt.Errorf("load app instance: %w", err)
	}
	instance.Status = apps.InstanceStatus(status)
	instance.Runtime = apps.RuntimeStatus(runtime)
	if jsonErr := json.Unmarshal([]byte(optionsJSON), &instance.Options); jsonErr != nil {
		return apps.Instance{}, fmt.Errorf("decode instance options: %w", jsonErr)
	}
	if parsed, parseErr := time.Parse(time.RFC3339Nano, createdAt); parseErr == nil {
		instance.CreatedAt = parsed
	}
	if parsed, parseErr := time.Parse(time.RFC3339Nano, updatedAt); parseErr == nil {
		instance.UpdatedAt = parsed
	}
	return instance, nil
}

func (s *AppsStore) ListInstances(ctx context.Context) ([]apps.Instance, error) {
	rows, err := s.db.SQL().QueryContext(ctx, `
		SELECT id, app_id, status, compose_hash, last_error, options_json,
			installed_version, runtime_status, created_at, updated_at
		FROM app_instances
		ORDER BY app_id
	`)
	if err != nil {
		return nil, fmt.Errorf("list app instances: %w", err)
	}
	defer rows.Close()

	var instances []apps.Instance
	for rows.Next() {
		var (
			instance    apps.Instance
			status      string
			optionsJSON string
			runtime     string
			createdAt   string
			updatedAt   string
		)
		if err := rows.Scan(
			&instance.ID, &instance.AppID, &status, &instance.ComposeHash,
			&instance.LastError, &optionsJSON, &instance.Version, &runtime,
			&createdAt, &updatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan app instance: %w", err)
		}
		instance.Status = apps.InstanceStatus(status)
		instance.Runtime = apps.RuntimeStatus(runtime)
		if jsonErr := json.Unmarshal([]byte(optionsJSON), &instance.Options); jsonErr != nil {
			return nil, fmt.Errorf("decode instance options: %w", jsonErr)
		}
		if parsed, parseErr := time.Parse(time.RFC3339Nano, createdAt); parseErr == nil {
			instance.CreatedAt = parsed
		}
		if parsed, parseErr := time.Parse(time.RFC3339Nano, updatedAt); parseErr == nil {
			instance.UpdatedAt = parsed
		}
		instances = append(instances, instance)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate app instances: %w", err)
	}
	return instances, nil
}

func (s *AppsStore) DeleteInstance(ctx context.Context, appID string) error {
	result, err := s.db.SQL().ExecContext(ctx, `
		DELETE FROM app_instances WHERE app_id = ?
	`, appID)
	if err != nil {
		return fmt.Errorf("delete app instance: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return apps.ErrNotFound
	}
	return nil
}

func (s *AppsStore) UpdateInstanceRuntime(
	ctx context.Context,
	appID string,
	runtime apps.RuntimeStatus,
	lastError string,
) error {
	result, err := s.db.SQL().ExecContext(ctx, `
		UPDATE app_instances SET
			runtime_status = ?, last_error = ?, updated_at = ?
		WHERE app_id = ?
	`, string(runtime), lastError, time.Now().UTC().Format(time.RFC3339Nano), appID)
	if err != nil {
		return fmt.Errorf("update app instance runtime: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return apps.ErrNotFound
	}
	return nil
}

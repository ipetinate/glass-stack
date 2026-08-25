package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/store"
)

type CatalogStore struct {
	db *Database
}

func NewCatalogStore(db *Database) *CatalogStore {
	return &CatalogStore{db: db}
}

func (s *CatalogStore) List(ctx context.Context) ([]store.CatalogRecord, error) {
	rows, err := s.db.SQL().QueryContext(ctx, `
		SELECT summary_json, detail_json, version, content_hash, synced_at
		FROM store_apps
		ORDER BY id
	`)
	if err != nil {
		return nil, fmt.Errorf("list store apps: %w", err)
	}
	defer rows.Close()

	records := []store.CatalogRecord{}
	for rows.Next() {
		var (
			record      store.CatalogRecord
			summaryJSON string
			detailJSON  string
		)
		if err := rows.Scan(&summaryJSON, &detailJSON, &record.Version, &record.ContentHash, &record.SyncedAt); err != nil {
			return nil, fmt.Errorf("scan store app: %w", err)
		}
		if err := json.Unmarshal([]byte(summaryJSON), &record.Summary); err != nil {
			return nil, fmt.Errorf("decode store app summary: %w", err)
		}
		if err := json.Unmarshal([]byte(detailJSON), &record.App); err != nil {
			return nil, fmt.Errorf("decode store app detail: %w", err)
		}
		records = append(records, record)
	}
	return records, rows.Err()
}

func (s *CatalogStore) Upsert(ctx context.Context, record store.CatalogRecord) error {
	summaryJSON, err := json.Marshal(record.Summary)
	if err != nil {
		return fmt.Errorf("encode store app summary: %w", err)
	}
	detailJSON, err := json.Marshal(record.App)
	if err != nil {
		return fmt.Errorf("encode store app detail: %w", err)
	}

	_, err = s.db.SQL().ExecContext(ctx, `
		INSERT INTO store_apps (id, summary_json, detail_json, version, content_hash, synced_at)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			summary_json = excluded.summary_json,
			detail_json = excluded.detail_json,
			version = excluded.version,
			content_hash = excluded.content_hash,
			synced_at = excluded.synced_at
	`, record.Summary.ID, string(summaryJSON), string(detailJSON), record.Version, record.ContentHash, time.Now().UTC().Format(time.RFC3339))
	if err != nil {
		return fmt.Errorf("upsert store app: %w", err)
	}
	return nil
}

func (s *CatalogStore) DeleteMissing(ctx context.Context, keepIDs []string) (int64, error) {
	if len(keepIDs) == 0 {
		result, err := s.db.SQL().ExecContext(ctx, `DELETE FROM store_apps`)
		if err != nil {
			return 0, fmt.Errorf("clear store apps: %w", err)
		}
		affected, _ := result.RowsAffected()
		return affected, nil
	}

	tx, err := s.db.SQL().BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("begin delete transaction: %w", err)
	}
	defer tx.Rollback()

	total := int64(0)
	for start := 0; start < len(keepIDs); start += 100 {
		end := min(start+100, len(keepIDs))
		batch := keepIDs[start:end]
		placeholders := ""
		args := make([]any, 0, len(batch))
		for index, id := range batch {
			if index > 0 {
				placeholders += ", "
			}
			placeholders += "?"
			args = append(args, id)
		}
		result, err := tx.ExecContext(
			ctx,
			fmt.Sprintf(`DELETE FROM store_apps WHERE id NOT IN (%s)`, placeholders),
			args...,
		)
		if err != nil {
			return 0, fmt.Errorf("delete stale store apps: %w", err)
		}
		affected, _ := result.RowsAffected()
		total += affected
	}
	return total, tx.Commit()
}

func (s *CatalogStore) SyncState(ctx context.Context) (string, time.Time, error) {
	var (
		commitSHA string
		syncedAt  string
	)
	err := s.db.SQL().QueryRowContext(
		ctx,
		`SELECT commit_sha, synced_at FROM store_sync_state WHERE id = 1`,
	).Scan(&commitSHA, &syncedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return "", time.Time{}, nil
	}
	if err != nil {
		return "", time.Time{}, fmt.Errorf("read store sync state: %w", err)
	}
	parsed, parseErr := time.Parse(time.RFC3339, syncedAt)
	if parseErr != nil {
		return commitSHA, time.Time{}, nil
	}
	return commitSHA, parsed, nil
}

func (s *CatalogStore) SaveSyncState(ctx context.Context, commitSHA string, syncedAt time.Time) error {
	_, err := s.db.SQL().ExecContext(ctx, `
		INSERT INTO store_sync_state (id, commit_sha, synced_at)
		VALUES (1, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			commit_sha = excluded.commit_sha,
			synced_at = excluded.synced_at
	`, commitSHA, syncedAt.Format(time.RFC3339))
	if err != nil {
		return fmt.Errorf("save store sync state: %w", err)
	}
	return nil
}

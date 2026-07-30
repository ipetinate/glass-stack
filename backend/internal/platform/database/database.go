package database

import (
	"context"
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

type Database struct {
	db      *sql.DB
	writeMu sync.Mutex
}

func Open(ctx context.Context, path string) (*Database, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return nil, fmt.Errorf("create database directory: %w", err)
	}

	dsn := fmt.Sprintf(
		"file:%s?_busy_timeout=5000&_foreign_keys=on&_journal_mode=WAL&_synchronous=FULL&_secure_delete=FAST",
		path,
	)
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	db.SetMaxOpenConns(4)
	db.SetMaxIdleConns(2)
	db.SetConnMaxLifetime(0)

	database := &Database{db: db}
	if err := database.initialize(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	if err := os.Chmod(path, 0o600); err != nil && !errors.Is(err, os.ErrNotExist) {
		_ = db.Close()
		return nil, fmt.Errorf("protect database file: %w", err)
	}
	return database, nil
}

func (database *Database) SQL() *sql.DB {
	return database.db
}

func (database *Database) Write(ctx context.Context, operation func(*sql.Tx) error) error {
	database.writeMu.Lock()
	defer database.writeMu.Unlock()

	transaction, err := database.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin write transaction: %w", err)
	}
	if err := operation(transaction); err != nil {
		_ = transaction.Rollback()
		return err
	}
	if err := transaction.Commit(); err != nil {
		return fmt.Errorf("commit write transaction: %w", err)
	}
	return nil
}

func (database *Database) QuickCheck(ctx context.Context) error {
	var result string
	if err := database.db.QueryRowContext(ctx, "PRAGMA quick_check").Scan(&result); err != nil {
		return fmt.Errorf("run sqlite quick check: %w", err)
	}
	if result != "ok" {
		return fmt.Errorf("sqlite quick check failed: %s", result)
	}
	return nil
}

func (database *Database) Backup(ctx context.Context, destination string) error {
	database.writeMu.Lock()
	defer database.writeMu.Unlock()

	if err := os.MkdirAll(filepath.Dir(destination), 0o700); err != nil {
		return fmt.Errorf("create backup directory: %w", err)
	}
	_ = os.Remove(destination)
	if _, err := database.db.ExecContext(ctx, "VACUUM INTO ?", destination); err != nil {
		return fmt.Errorf("backup sqlite database: %w", err)
	}
	if err := os.Chmod(destination, 0o600); err != nil {
		return fmt.Errorf("protect database backup: %w", err)
	}
	return nil
}

func (database *Database) Close() error {
	return database.db.Close()
}

func (database *Database) initialize(ctx context.Context) error {
	if _, err := database.db.ExecContext(ctx, `
		PRAGMA journal_mode=WAL;
		PRAGMA synchronous=FULL;
		PRAGMA foreign_keys=ON;
		PRAGMA wal_autocheckpoint=1000;
		PRAGMA journal_size_limit=67108864;
		PRAGMA cache_size=-8192;
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL
		);
	`); err != nil {
		return fmt.Errorf("initialize sqlite pragmas: %w", err)
	}

	entries, err := fs.ReadDir(migrationFiles, "migrations")
	if err != nil {
		return fmt.Errorf("read embedded migrations: %w", err)
	}
	sort.Slice(entries, func(left, right int) bool {
		return entries[left].Name() < entries[right].Name()
	})

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		var applied int
		err := database.db.QueryRowContext(
			ctx,
			"SELECT COUNT(1) FROM schema_migrations WHERE version = ?",
			entry.Name(),
		).Scan(&applied)
		if err != nil {
			return fmt.Errorf("check migration %s: %w", entry.Name(), err)
		}
		if applied > 0 {
			continue
		}
		content, err := migrationFiles.ReadFile("migrations/" + entry.Name())
		if err != nil {
			return fmt.Errorf("read migration %s: %w", entry.Name(), err)
		}
		if err := database.Write(ctx, func(transaction *sql.Tx) error {
			if _, err := transaction.ExecContext(ctx, string(content)); err != nil {
				return fmt.Errorf("apply migration %s: %w", entry.Name(), err)
			}
			if _, err := transaction.ExecContext(
				ctx,
				"INSERT INTO schema_migrations(version, applied_at) VALUES(?, ?)",
				entry.Name(),
				time.Now().UTC().Format(time.RFC3339Nano),
			); err != nil {
				return fmt.Errorf("record migration %s: %w", entry.Name(), err)
			}
			return nil
		}); err != nil {
			return err
		}
	}
	return database.QuickCheck(ctx)
}

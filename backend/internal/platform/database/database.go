package database

import (
	"context"
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"net/url"
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
	path    string
	writeMu sync.Mutex
}

func Open(ctx context.Context, path string) (*Database, error) {
	absolutePath, err := filepath.Abs(path)
	if err != nil {
		return nil, fmt.Errorf("resolve database path: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(absolutePath), 0o700); err != nil {
		return nil, fmt.Errorf("create database directory: %w", err)
	}

	dsn := fmt.Sprintf(
		"file:%s?_busy_timeout=5000&_foreign_keys=on&_journal_mode=WAL&_synchronous=FULL&_secure_delete=FAST",
		absolutePath,
	)
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	db.SetMaxOpenConns(4)
	db.SetMaxIdleConns(2)
	db.SetConnMaxLifetime(0)

	database := &Database{db: db, path: absolutePath}
	if err := database.initialize(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	if err := os.Chmod(absolutePath, 0o600); err != nil && !errors.Is(err, os.ErrNotExist) {
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

	absoluteDestination, err := filepath.Abs(destination)
	if err != nil {
		return fmt.Errorf("resolve backup destination: %w", err)
	}
	if absoluteDestination == database.path {
		return fmt.Errorf("backup destination must differ from the active database")
	}
	backupDirectory := filepath.Dir(absoluteDestination)
	if err := os.MkdirAll(backupDirectory, 0o700); err != nil {
		return fmt.Errorf("create backup directory: %w", err)
	}
	temporary, err := os.CreateTemp(backupDirectory, ".glass-stack-backup-*.db")
	if err != nil {
		return fmt.Errorf("create temporary database backup: %w", err)
	}
	temporaryPath := temporary.Name()
	if err := temporary.Close(); err != nil {
		_ = os.Remove(temporaryPath)
		return fmt.Errorf("close temporary database backup: %w", err)
	}
	if err := os.Remove(temporaryPath); err != nil {
		return fmt.Errorf("prepare temporary database backup: %w", err)
	}
	defer os.Remove(temporaryPath)

	if _, err := database.db.ExecContext(ctx, "VACUUM INTO ?", temporaryPath); err != nil {
		return fmt.Errorf("backup sqlite database: %w", err)
	}
	if err := os.Chmod(temporaryPath, 0o600); err != nil {
		return fmt.Errorf("protect database backup: %w", err)
	}
	if err := syncFile(temporaryPath); err != nil {
		return fmt.Errorf("sync database backup: %w", err)
	}
	if err := quickCheckFile(ctx, temporaryPath); err != nil {
		return fmt.Errorf("validate database backup: %w", err)
	}
	if err := os.Rename(temporaryPath, absoluteDestination); err != nil {
		return fmt.Errorf("publish database backup: %w", err)
	}
	if err := syncDirectory(backupDirectory); err != nil {
		return fmt.Errorf("sync backup directory: %w", err)
	}
	return nil
}

func quickCheckFile(ctx context.Context, path string) error {
	dsn := (&url.URL{
		Scheme:   "file",
		Path:     path,
		RawQuery: "mode=ro&_foreign_keys=on",
	}).String()
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return err
	}
	defer db.Close()
	var result string
	if err := db.QueryRowContext(ctx, "PRAGMA quick_check").Scan(&result); err != nil {
		return err
	}
	if result != "ok" {
		return fmt.Errorf("sqlite quick check failed: %s", result)
	}
	return nil
}

func syncFile(path string) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()
	return file.Sync()
}

func syncDirectory(path string) error {
	directory, err := os.Open(path)
	if err != nil {
		return err
	}
	defer directory.Close()
	return directory.Sync()
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

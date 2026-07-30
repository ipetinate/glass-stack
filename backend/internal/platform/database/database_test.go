package database

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestBackupAtomicallyReplacesPreviousBackup(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	directory := t.TempDir()
	source, err := Open(ctx, filepath.Join(directory, "source.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = source.Close() })
	if _, err := source.SQL().ExecContext(
		ctx,
		"CREATE TABLE backup_test(value TEXT NOT NULL)",
	); err != nil {
		t.Fatal(err)
	}
	if _, err := source.SQL().ExecContext(
		ctx,
		"INSERT INTO backup_test(value) VALUES('preserved')",
	); err != nil {
		t.Fatal(err)
	}

	destination := filepath.Join(directory, "backups", "control-plane.db")
	if err := os.MkdirAll(filepath.Dir(destination), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(destination, []byte("previous backup"), 0o600); err != nil {
		t.Fatal(err)
	}

	if err := source.Backup(ctx, destination); err != nil {
		t.Fatal(err)
	}

	backup, err := Open(ctx, destination)
	if err != nil {
		t.Fatal(err)
	}
	defer backup.Close()
	var value string
	if err := backup.SQL().QueryRowContext(
		ctx,
		"SELECT value FROM backup_test",
	).Scan(&value); err != nil {
		t.Fatal(err)
	}
	if value != "preserved" {
		t.Fatalf("backup value = %q", value)
	}
	info, err := os.Stat(destination)
	if err != nil {
		t.Fatal(err)
	}
	if permissions := info.Mode().Perm(); permissions != 0o600 {
		t.Fatalf("backup permissions = %o, want 600", permissions)
	}
}

func TestBackupFailurePreservesPreviousBackup(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	directory := t.TempDir()
	source, err := Open(ctx, filepath.Join(directory, "source.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = source.Close() })

	destination := filepath.Join(directory, "control-plane.db")
	const previous = "known-good-backup"
	if err := os.WriteFile(destination, []byte(previous), 0o600); err != nil {
		t.Fatal(err)
	}
	cancelled, cancel := context.WithCancel(ctx)
	cancel()

	if err := source.Backup(cancelled, destination); err == nil {
		t.Fatal("expected cancelled backup to fail")
	}
	content, err := os.ReadFile(destination)
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != previous {
		t.Fatalf("previous backup changed to %q", content)
	}
}

func TestBackupRejectsActiveDatabasePath(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "source.db")
	source, err := Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = source.Close() })

	err = source.Backup(ctx, path)
	if err == nil {
		t.Fatal("expected active database destination to be rejected")
	}
	if err := source.QuickCheck(ctx); err != nil {
		t.Fatalf("active database was damaged: %v", err)
	}
}

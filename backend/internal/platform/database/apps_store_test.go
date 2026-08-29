package database_test

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/apps"
	"github.com/ipetinate/glass-stack/backend/internal/platform/database"
	"github.com/ipetinate/glass-stack/backend/internal/store"
)

func newAppsStore(t *testing.T) (*database.AppsStore, *database.Database) {
	t.Helper()
	db, err := database.Open(context.Background(), filepath.Join(t.TempDir(), "apps.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })

	ctx := context.Background()
	const compose = "name: sqlite-browser\nservices:\n  web:\n    image: linuxserver/sqlitebrowser\n"
	if err := database.NewCatalogStore(db).Upsert(ctx, store.CatalogRecord{
		Summary: store.ApplicationSummaryDTO{ID: "sqlite-browser"},
		Version: "1",
		Compose: compose,
	}); err != nil {
		t.Fatal(err)
	}
	return database.NewAppsStore(db), db
}

func composeManifest(appID string) string {
	return "name: " + appID + "\nservices:\n  web:\n    image: example/" + appID + ":latest\n"
}

func TestAppsStoreOperationRoundTrip(t *testing.T) {
	store, _ := newAppsStore(t)
	ctx := context.Background()

	operation := apps.Operation{
		ID:        "op-1",
		AppID:     "sqlite-browser",
		Kind:      apps.OperationKindInstall,
		Status:    apps.OperationRunning,
		Progress:  60,
		Message:   "aplicando docker compose",
		CreatedAt: time.Date(2026, 8, 27, 12, 0, 0, 0, time.UTC),
	}
	if err := store.CreateOperation(ctx, operation); err != nil {
		t.Fatal(err)
	}

	loaded, err := store.LoadOperation(ctx, operation.ID)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.ID != operation.ID || loaded.AppID != operation.AppID ||
		loaded.Kind != operation.Kind || loaded.Status != operation.Status ||
		loaded.Progress != operation.Progress || loaded.Message != operation.Message {
		t.Fatalf("loaded = %+v", loaded)
	}

	completed := time.Date(2026, 8, 27, 12, 1, 0, 0, time.UTC)
	operation.Status = apps.OperationSucceeded
	operation.Progress = 100
	operation.CompletedAt = &completed
	if err := store.UpdateOperation(ctx, operation); err != nil {
		t.Fatal(err)
	}

	loaded, err = store.LoadOperation(ctx, operation.ID)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.Status != apps.OperationSucceeded || loaded.Progress != 100 ||
		loaded.CompletedAt == nil || !loaded.CompletedAt.Equal(completed) {
		t.Fatalf("after update loaded = %+v", loaded)
	}
}

func TestAppsStoreUpdateFinalOperationIsNoop(t *testing.T) {
	store, _ := newAppsStore(t)
	ctx := context.Background()

	operation := apps.Operation{
		ID: "op-1", AppID: "sqlite-browser", Kind: apps.OperationKindInstall,
		Status: apps.OperationFailed, CreatedAt: time.Now().UTC(),
	}
	if err := store.CreateOperation(ctx, operation); err != nil {
		t.Fatal(err)
	}
	if err := store.UpdateOperation(ctx, operation); !errors.Is(err, apps.ErrNotFound) {
		t.Fatalf("err = %v", err)
	}
}

func TestAppsStoreLoadOperationNotFound(t *testing.T) {
	store, _ := newAppsStore(t)
	_, err := store.LoadOperation(context.Background(), "op-ghost")
	if !errors.Is(err, apps.ErrNotFound) {
		t.Fatalf("err = %v", err)
	}
}

func TestAppsStoreInstanceRoundTrip(t *testing.T) {
	store, _ := newAppsStore(t)
	ctx := context.Background()

	instance := apps.Instance{
		ID:          "inst-1",
		AppID:       "sqlite-browser",
		Status:      apps.InstanceInstalling,
		ComposeHash: "sha256:abc",
		CreatedAt:   time.Date(2026, 8, 27, 12, 0, 0, 0, time.UTC),
		UpdatedAt:   time.Date(2026, 8, 27, 12, 0, 0, 0, time.UTC),
	}
	if err := store.UpsertInstance(ctx, instance); err != nil {
		t.Fatal(err)
	}

	loaded, err := store.LoadInstance(ctx, instance.AppID)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.ID != instance.ID || loaded.Status != instance.Status ||
		loaded.ComposeHash != instance.ComposeHash {
		t.Fatalf("loaded = %+v", loaded)
	}

	instance.Status = apps.InstanceInstalled
	instance.LastError = ""
	instance.UpdatedAt = time.Date(2026, 8, 27, 12, 2, 0, 0, time.UTC)
	if err := store.UpsertInstance(ctx, instance); err != nil {
		t.Fatal(err)
	}

	loaded, err = store.LoadInstance(ctx, instance.AppID)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.Status != apps.InstanceInstalled {
		t.Fatalf("after upsert loaded = %+v", loaded)
	}
}

func TestAppsStoreInstanceNotFound(t *testing.T) {
	store, _ := newAppsStore(t)
	_, err := store.LoadInstance(context.Background(), "ghost")
	if !errors.Is(err, apps.ErrNotFound) {
		t.Fatalf("err = %v", err)
	}
}

func TestAppsStoreInstanceOptionsVersionRuntimeRoundTrip(t *testing.T) {
	store, _ := newAppsStore(t)
	ctx := context.Background()

	instance := apps.Instance{
		ID:          "inst-opts",
		AppID:       "sqlite-browser",
		Status:      apps.InstanceInstalled,
		ComposeHash: "sha256:abc",
		Options:     apps.InstallOptions{Port: 8080, Volume: "shared-data"},
		Version:     "1.2.3",
		Runtime:     apps.RuntimeRunning,
		CreatedAt:   time.Date(2026, 8, 27, 12, 0, 0, 0, time.UTC),
		UpdatedAt:   time.Date(2026, 8, 27, 12, 0, 0, 0, time.UTC),
	}
	if err := store.UpsertInstance(ctx, instance); err != nil {
		t.Fatal(err)
	}

	loaded, err := store.LoadInstance(ctx, instance.AppID)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.Options != instance.Options {
		t.Fatalf("options = %+v, want %+v", loaded.Options, instance.Options)
	}
	if loaded.Version != instance.Version {
		t.Fatalf("version = %q, want %q", loaded.Version, instance.Version)
	}
	if loaded.Runtime != instance.Runtime {
		t.Fatalf("runtime = %q, want %q", loaded.Runtime, instance.Runtime)
	}
}

func TestAppsStoreListInstancesOrderedByAppID(t *testing.T) {
	appsStore, db := newAppsStore(t)
	ctx := context.Background()

	for _, appID := range []string{"zeta", "alpha", "mid"} {
		if err := database.NewCatalogStore(db).Upsert(ctx, store.CatalogRecord{
			Summary: store.ApplicationSummaryDTO{ID: appID},
			Version: "1",
			Compose: composeManifest(appID),
		}); err != nil {
			t.Fatal(err)
		}
		if err := appsStore.UpsertInstance(ctx, apps.Instance{
			ID: appID, AppID: appID, Status: apps.InstanceInstalled,
			CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
		}); err != nil {
			t.Fatal(err)
		}
	}

	instances, err := appsStore.ListInstances(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(instances) != 3 {
		t.Fatalf("len = %d", len(instances))
	}
	for i, appID := range []string{"alpha", "mid", "zeta"} {
		if instances[i].AppID != appID {
			t.Fatalf("instances[%d].AppID = %q, want %q", i, instances[i].AppID, appID)
		}
	}
}

func TestAppsStoreDeleteInstance(t *testing.T) {
	store, _ := newAppsStore(t)
	ctx := context.Background()

	if err := store.UpsertInstance(ctx, apps.Instance{
		ID: "d", AppID: "sqlite-browser", Status: apps.InstanceInstalled,
		CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatal(err)
	}
	if err := store.DeleteInstance(ctx, "sqlite-browser"); err != nil {
		t.Fatal(err)
	}
	if _, err := store.LoadInstance(ctx, "sqlite-browser"); !errors.Is(err, apps.ErrNotFound) {
		t.Fatalf("after delete LoadInstance err = %v", err)
	}
	if err := store.DeleteInstance(ctx, "ghost"); !errors.Is(err, apps.ErrNotFound) {
		t.Fatalf("delete missing err = %v", err)
	}
}

func TestAppsStoreUpdateInstanceRuntime(t *testing.T) {
	store, _ := newAppsStore(t)
	ctx := context.Background()

	if err := store.UpsertInstance(ctx, apps.Instance{
		ID: "r", AppID: "sqlite-browser", Status: apps.InstanceInstalled,
		CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatal(err)
	}

	if err := store.UpdateInstanceRuntime(ctx, "sqlite-browser", apps.RuntimeStopped, ""); err != nil {
		t.Fatal(err)
	}
	loaded, err := store.LoadInstance(ctx, "sqlite-browser")
	if err != nil {
		t.Fatal(err)
	}
	if loaded.Runtime != apps.RuntimeStopped {
		t.Fatalf("runtime = %q", loaded.Runtime)
	}
	if loaded.CreatedAt.After(loaded.UpdatedAt) {
		t.Fatalf("updated_at did not refresh: created=%v updated=%v", loaded.CreatedAt, loaded.UpdatedAt)
	}

	if err := store.UpdateInstanceRuntime(ctx, "ghost", apps.RuntimeRunning, ""); !errors.Is(err, apps.ErrNotFound) {
		t.Fatalf("update missing err = %v", err)
	}
}

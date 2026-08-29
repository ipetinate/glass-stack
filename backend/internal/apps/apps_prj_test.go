package apps

import (
	"context"
	"errors"
	"testing"
	"time"
)

func projectionService() *Installer {
	return NewInstaller(
		newMemoryStore(),
		fakeManifests{compose: map[string]string{"uptime-kuma": fixtureCompose}},
		nil,
		"",
		nil,
		nil,
	)
}

func seedCustomInstance(t *testing.T, store Store, instance Instance) {
	t.Helper()
	if err := store.UpsertInstance(context.Background(), instance); err != nil {
		t.Fatal(err)
	}
}

func TestAppsProjectsInstalledApps(t *testing.T) {
	service := projectionService()
	updatedAt := time.Date(2026, 8, 28, 12, 0, 0, 0, time.UTC)
	seedCustomInstance(t, service.store, Instance{
		ID: "uptime-kuma", AppID: "uptime-kuma", Status: InstanceInstalled,
		Options: InstallOptions{Port: 8080}, Version: "1.23.16",
		Runtime: RuntimeRunning, LastError: "", UpdatedAt: updatedAt,
	})
	seedCustomInstance(t, service.store, Instance{
		ID: "jellyfin", AppID: "jellyfin", Status: InstanceInstalled,
		Options: InstallOptions{}, Version: "10.8.4",
		Runtime: RuntimeStopped, LastError: "falha anterior", UpdatedAt: updatedAt,
	})

	appsOut, err := service.Apps(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(appsOut) != 2 {
		t.Fatalf("len = %d", len(appsOut))
	}
	var kuma, jelly *InstalledApp
	for index := range appsOut {
		switch appsOut[index].ID {
		case "uptime-kuma":
			kuma = &appsOut[index]
		case "jellyfin":
			jelly = &appsOut[index]
		}
	}
	if kuma == nil || jelly == nil {
		t.Fatalf("appsOut = %+v", appsOut)
	}
	if kuma.Title != "Uptime Kuma" || kuma.Version != "1.23.16" {
		t.Fatalf("kuma = %+v", kuma)
	}
	if kuma.Status != InstanceInstalled || kuma.Runtime != RuntimeRunning {
		t.Fatalf("kuma status/runtime = %+v", kuma)
	}
	if kuma.AccessURL != "http://localhost:8080/" {
		t.Fatalf("kuma accessURL = %q", kuma.AccessURL)
	}
	if kuma.Options.Port != 8080 || kuma.LastError != "" || !kuma.UpdatedAt.Equal(updatedAt) {
		t.Fatalf("kuma = %+v", kuma)
	}
	if jelly.Title != "" {
		t.Fatalf("jellyfin title should fall back to empty, got %q", jelly.Title)
	}
	if jelly.AccessURL != "" {
		t.Fatalf("jellyfin accessURL should be empty, got %q", jelly.AccessURL)
	}
	if jelly.Runtime != RuntimeStopped || jelly.LastError != "falha anterior" {
		t.Fatalf("jellyfin = %+v", jelly)
	}
}

func TestAppsEmptyReturnsEmptySlice(t *testing.T) {
	appsOut, err := projectionService().Apps(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if appsOut == nil {
		t.Fatal("apps = nil, want empty non-nil slice")
	}
	if len(appsOut) != 0 {
		t.Fatalf("len = %d", len(appsOut))
	}
}

func TestAppProjectsSingleInstance(t *testing.T) {
	service := projectionService()
	seedCustomInstance(t, service.store, Instance{
		ID: "uptime-kuma", AppID: "uptime-kuma", Status: InstanceInstalled,
		Options: InstallOptions{Port: 9090}, Version: "1.23.16",
		Runtime: RuntimeDegraded,
	})
	projected, err := service.App(context.Background(), "uptime-kuma")
	if err != nil {
		t.Fatal(err)
	}
	if projected.ID != "uptime-kuma" || projected.Title != "Uptime Kuma" ||
		projected.Version != "1.23.16" || projected.Runtime != RuntimeDegraded ||
		projected.Options.Port != 9090 || projected.AccessURL != "http://localhost:9090/" {
		t.Fatalf("projected = %+v", projected)
	}
}

func TestAppNotInstalled(t *testing.T) {
	if _, err := projectionService().App(context.Background(), "ghost"); !errors.Is(err, ErrNotInstalled) {
		t.Fatalf("err = %v", err)
	}
}

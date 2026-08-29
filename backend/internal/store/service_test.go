package store

import (
	"context"
	"errors"
	"testing"
)

func TestServiceManifest(t *testing.T) {
	catalog := newMemoryCatalog()
	catalog.records["uptime-kuma"] = CatalogRecord{
		Summary: ApplicationSummaryDTO{ID: "uptime-kuma"},
		Compose: "name: uptime-kuma\nservices:\n  web:\n    image: louislam/uptime-kuma:1.23.16\n",
	}

	service := NewService(catalog, nil, nil, "", Config{}, nil)
	manifest, err := service.Manifest(context.Background(), "uptime-kuma")
	if err != nil {
		t.Fatal(err)
	}
	if manifest != catalog.records["uptime-kuma"].Compose {
		t.Fatalf("manifest = %q", manifest)
	}
}

func TestServiceManifestUnknownApp(t *testing.T) {
	service := NewService(newMemoryCatalog(), nil, nil, "", Config{}, nil)
	if _, err := service.Manifest(context.Background(), "ghost"); !errors.Is(err, ErrApplicationNotFound) {
		t.Fatalf("err = %v", err)
	}
}

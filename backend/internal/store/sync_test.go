package store

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

type memoryCatalog struct {
	records   map[string]CatalogRecord
	stateSHA  string
	upserts   int
	deletions int64
}

func newMemoryCatalog() *memoryCatalog {
	return &memoryCatalog{records: map[string]CatalogRecord{}}
}

func (m *memoryCatalog) List(ctx context.Context) ([]CatalogRecord, error) {
	result := make([]CatalogRecord, 0, len(m.records))
	for _, record := range m.records {
		result = append(result, record)
	}
	return result, nil
}

func (m *memoryCatalog) Upsert(ctx context.Context, record CatalogRecord) error {
	m.records[record.App.ID] = record
	m.upserts++
	return nil
}

func (m *memoryCatalog) DeleteMissing(ctx context.Context, keepIDs []string) (int64, error) {
	keep := map[string]bool{}
	for _, id := range keepIDs {
		keep[id] = true
	}
	var removed int64
	for id := range m.records {
		if !keep[id] {
			delete(m.records, id)
			removed++
		}
	}
	m.deletions += removed
	return removed, nil
}

func (m *memoryCatalog) SyncState(ctx context.Context) (string, time.Time, error) {
	return m.stateSHA, time.Time{}, nil
}

func (m *memoryCatalog) SaveSyncState(ctx context.Context, commitSHA string, syncedAt time.Time) error {
	m.stateSHA = commitSHA
	return nil
}

func fakeGitHub(t *testing.T, manifestYAML string) (*httptest.Server, *string) {
	t.Helper()
	commitSHA := "abc123def4567890"

	server := httptest.NewServer(http.HandlerFunc(func(
		response http.ResponseWriter,
		request *http.Request,
	) {
		switch {
		case request.URL.Path == "/repos/owner/store/commits/main":
			if request.Header.Get("If-None-Match") == `"`+commitSHA+`"` {
				response.WriteHeader(http.StatusNotModified)
				return
			}
			response.Header().Set("ETag", `"`+commitSHA+`"`)
			_ = json.NewEncoder(response).Encode(map[string]any{"sha": commitSHA})
		case request.URL.Path == "/owner/store/tar.gz/refs/heads/main":
			var buffer bytes.Buffer
			gzipWriter := gzip.NewWriter(&buffer)
			tarWriter := tar.NewWriter(gzipWriter)
			writeTarFile := func(name string, content []byte) {
				header := &tar.Header{
					Name: name,
					Mode: 0o644,
					Size: int64(len(content)),
				}
				_ = tarWriter.WriteHeader(header)
				_, _ = tarWriter.Write(content)
			}
			writeTarFile("store-main/apps/jellyfin/docker-compose.yaml", []byte(manifestYAML))
			writeTarFile("store-main/apps/jellyfin/icon.png", []byte("fake-png-bytes"))
			_ = tarWriter.Close()
			_ = gzipWriter.Close()
			response.Header().Set("Content-Type", "application/gzip")
			response.Write(buffer.Bytes())
		default:
			http.NotFound(response, request)
		}
	}))
	t.Cleanup(server.Close)
	return server, &commitSHA
}

const storeManifest = validManifest

func TestSyncDownloadsAndStores(t *testing.T) {
	server, _ := fakeGitHub(t, storeManifest)
	catalog := newMemoryCatalog()

	client := NewSourceClient(nil,
		server.URL,
		server.URL,
		"",
	)
	service := NewService(catalog, client, server.Client(), t.TempDir(), Config{
		Repository:        "owner/store",
		Branch:            "main",
		PollIntervalHours: 6,
	}, nil)

	summary, err := service.Sync(context.Background())
	if err != nil {
		t.Fatalf("Sync() error = %v", err)
	}
	if summary.Added != 1 || summary.Updated != 0 || summary.Unchanged {
		t.Errorf("unexpected summary: %+v", summary)
	}
	record, ok := catalog.records["jellyfin"]
	if !ok {
		t.Fatal("jellyfin not stored in catalog")
	}
	if record.App.Name != "Jellyfin" {
		t.Errorf("Name = %q", record.App.Name)
	}
	if catalog.stateSHA[:7] != "abc123d" {
		t.Errorf("state sha = %q", catalog.stateSHA)
	}
}

func TestSyncSkipsWhenUnchanged(t *testing.T) {
	server, _ := fakeGitHub(t, storeManifest)
	catalog := newMemoryCatalog()
	client := NewSourceClient(nil,
		server.URL,
		server.URL,
		"",
	)
	service := NewService(catalog, client, server.Client(), t.TempDir(), Config{
		Repository:        "owner/store",
		Branch:            "main",
		PollIntervalHours: 6,
	}, nil)

	if _, err := service.Sync(context.Background()); err != nil {
		t.Fatalf("first Sync() error = %v", err)
	}
	summary, err := service.Sync(context.Background())
	if err != nil {
		t.Fatalf("second Sync() error = %v", err)
	}
	if !summary.Unchanged {
		t.Errorf("expected unchanged summary, got %+v", summary)
	}
	if catalog.upserts > 1 {
		t.Errorf("upsert ran %d times", catalog.upserts)
	}
}

func TestSyncRemovesStaleApps(t *testing.T) {
	server, _ := fakeGitHub(t, storeManifest)
	catalog := newMemoryCatalog()
	catalog.records["ghost"] = CatalogRecord{}
	client := NewSourceClient(nil,
		server.URL,
		server.URL,
		"",
	)
	service := NewService(catalog, client, server.Client(), t.TempDir(), Config{
		Repository:        "owner/store",
		Branch:            "main",
		PollIntervalHours: 6,
	}, nil)

	summary, err := service.Sync(context.Background())
	if err != nil {
		t.Fatalf("Sync() error = %v", err)
	}
	if summary.Removed != 1 {
		t.Errorf("Removed = %d", summary.Removed)
	}
	if _, ok := catalog.records["ghost"]; ok {
		t.Error("ghost app not removed")
	}
}

func TestSyncCopiesLocalAssetAndServesPath(t *testing.T) {
	localManifest := `
name: jellyfin
services:
  jellyfin:
    image: jellyfin/jellyfin:10.10.6
x-glass:
  title: Jellyfin
  description: Media server.
  developer: Jellyfin Project
  category: multimedia
  version: 10.10.6
  icon: ./icon.png
  entrypoint:
    main: jellyfin
`
	server, _ := fakeGitHub(t, localManifest)
	catalog := newMemoryCatalog()
	dataDir := t.TempDir()
	client := NewSourceClient(nil,
		server.URL,
		server.URL,
		"",
	)
	service := NewService(catalog, client, server.Client(), dataDir, Config{
		Repository:        "owner/store",
		Branch:            "main",
		PollIntervalHours: 6,
	}, nil)

	if _, err := service.Sync(context.Background()); err != nil {
		t.Fatalf("Sync() error = %v", err)
	}
	iconPath := filepath.Join(dataDir, "jellyfin", assetsSubdirectory, "icon.png")
	content, err := os.ReadFile(iconPath)
	if err != nil {
		t.Fatalf("local icon asset not copied: %v", err)
	}
	if string(content) != "fake-png-bytes" {
		t.Errorf("icon content = %q", content)
	}
	record := catalog.records["jellyfin"]
	expected := fmt.Sprintf("/api/v1/store/apps/%s/assets/%s", "jellyfin", "icon.png")
	if record.Summary.IconSrc != expected {
		t.Errorf("IconSrc = %q, want %q", record.Summary.IconSrc, expected)
	}
}

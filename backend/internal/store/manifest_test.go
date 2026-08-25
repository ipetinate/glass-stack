package store

import (
	"strings"
	"testing"
)

const validManifest = `
name: jellyfin
services:
  jellyfin:
    image: jellyfin/jellyfin:10.10.6
    ports:
      - "8096:8096"
x-glass:
  title: Jellyfin
  tagline:
    pt_br: O seu media server
    en_us: Your media server
  description:
    pt_br: Descrição longa em português.
    en_us: Long description in English.
  developer: Jellyfin Project
  category: multimedia
  tags: [media]
  architectures: [amd64, arm64]
  version: 10.10.6
  updatedAt: "2026-01-15"
  icon: https://example.com/icon.png
  background: https://example.com/thumbnail.png
  screenshots:
    - https://example.com/screenshot-1.png
  website: https://jellyfin.org
  entrypoint:
    main: jellyfin
    index: /
    portMap: 8096
    scheme: http
  requirements:
    memory:
      minimum: 2 GB
      recommended: 4 GB+
`

func TestParseManifest(t *testing.T) {
	app, err := ParseManifest([]byte(validManifest))
	if err != nil {
		t.Fatalf("ParseManifest() error = %v", err)
	}
	if app.ID != "jellyfin" {
		t.Errorf("ID = %q, want jellyfin", app.ID)
	}
	if app.Title != "Jellyfin" {
		t.Errorf("Title = %q", app.Title)
	}
	if app.Tagline != "O seu media server" {
		t.Errorf("Tagline should prefer pt_br, got %q", app.Tagline)
	}
	if app.Category != "multimedia" {
		t.Errorf("Category = %q", app.Category)
	}
	if len(app.Architectures) != 2 {
		t.Errorf("Architectures = %v", app.Architectures)
	}
	if app.Entrypoint.PortMap != "8096" {
		t.Errorf("PortMap = %q", app.Entrypoint.PortMap)
	}
	if app.Icon != "https://example.com/icon.png" {
		t.Errorf("Icon = %q", app.Icon)
	}
	if len(app.Screenshots) != 1 {
		t.Errorf("Screenshots = %v", app.Screenshots)
	}
	if len(app.Requirements.Memory.Minimum) == 0 {
		t.Error("Requirements.Memory.Minimum should be parsed")
	}
}

func TestSummaryAndDetailDTOs(t *testing.T) {
	app, err := ParseManifest([]byte(validManifest))
	if err != nil {
		t.Fatalf("ParseManifest() error = %v", err)
	}
	summary := app.Summary(
		"https://cdn.example/icon.png",
		nil,
	)
	if summary.ID != "jellyfin" || summary.Name != "Jellyfin" {
		t.Errorf("summary id/name mismatch: %+v", summary)
	}
	if summary.IconSrc != "https://cdn.example/icon.png" {
		t.Errorf("Icon override not applied: %q", summary.IconSrc)
	}
	detail := app.Detail(
		"https://cdn.example/icon.png",
		[]ScreenshotDTO{{ID: "s1", Src: "https://x/s1.png"}},
	)
	if len(detail.Screenshots) != 1 {
		t.Fatalf("Detail screenshots mismatch: %v", detail.Screenshots)
	}
	if detail.Version != "10.10.6" {
		t.Errorf("Version = %q", detail.Version)
	}
	var storageRow *RequirementRowDTO
	for index := range detail.Requirements {
		if detail.Requirements[index].Category == "Armazenamento" {
			storageRow = &detail.Requirements[index]
			break
		}
	}
	if storageRow == nil || storageRow.Recommended == "" {
		t.Error("default storage requirement missing")
	}
}

func TestParseManifestRejectsFloatingTag(t *testing.T) {
	manifest := `
name: badapp
services:
  main:
    image: nginx:latest
x-glass:
  title: Bad
  developer: Someone
  category: other
  icon: https://example.com/i.png
  entrypoint:
    main: main
`
	if _, err := ParseManifest([]byte(manifest)); err == nil {
		t.Fatal("expected error for floating :latest image")
	}
}

func TestParseManifestRequiresKnownService(t *testing.T) {
	manifest := strings.Replace(
		validManifest,
		"    main: jellyfin",
		"    main: nonexistent",
		1,
	)
	if _, err := ParseManifest([]byte(manifest)); err == nil {
		t.Fatal("expected error when entrypoint.main service is missing")
	}
}

func TestCasaOSFallback(t *testing.T) {
	manifest := `
name: casaosapp
services:
  web:
    image: nginx:1.27.0
x-casaos:
  title:
    custom: CasaOS App
  developer: IceWhale
  icon: https://example.com/casaos-icon.png
  thumbnail: https://example.com/thumb.png
  screenshot_link:
    - https://example.com/shot.png
  main: web
  port_map: "8080"
  scheme: http
`
	app, err := ParseManifest([]byte(manifest))
	if err != nil {
		t.Fatalf("ParseManifest() error = %v", err)
	}
	if app.Title != "CasaOS App" {
		t.Errorf("Title = %q", app.Title)
	}
	if app.Developer != "IceWhale" {
		t.Errorf("Developer = %q", app.Developer)
	}
	if app.Background != "https://example.com/thumb.png" {
		t.Errorf("Background from thumbnail expected, got %q", app.Background)
	}
	if len(app.Screenshots) != 1 {
		t.Errorf("Screenshots = %v", app.Screenshots)
	}
	if app.Category != "other" {
		t.Errorf("defaulted Category expected, got %q", app.Category)
	}
}

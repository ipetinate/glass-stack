package settings_test

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/platform/database"
	platformwallpaper "github.com/ipetinate/glass-stack/backend/internal/platform/wallpaper"
	"github.com/ipetinate/glass-stack/backend/internal/settings"
)

func TestUploadedWallpaperPersistsFileAndMetadata(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	directory := t.TempDir()
	db, err := database.Open(ctx, filepath.Join(directory, "glass-stack.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })

	now := time.Now().UTC().Format(time.RFC3339Nano)
	if _, err := db.SQL().Exec(
		`INSERT INTO users(
			id, username, username_normalized, password_hash, role, status,
			created_at, updated_at, password_changed_at
		) VALUES('user-1', 'owner', 'owner', 'unused', 'admin', 'active', ?, ?, ?)`,
		now,
		now,
		now,
	); err != nil {
		t.Fatal(err)
	}

	mediaDirectory := filepath.Join(directory, "media")
	service := settings.NewService(
		database.NewSettingsStore(db),
		platformwallpaper.NewAssetStorage(mediaDirectory),
		nil,
		false,
	)
	header := wallpaperHeader(t, "night-sky.png")
	first, err := saveUpload(ctx, service, "user-1", header)
	if err != nil {
		t.Fatal(err)
	}
	second, err := saveUpload(
		ctx,
		service,
		"user-1",
		wallpaperHeader(t, "copy.png"),
	)
	if err != nil {
		t.Fatal(err)
	}
	if first.ID == second.ID {
		t.Fatal("two selections must have distinct wallpaper records")
	}

	stored, asset, err := service.GetWallpaper(ctx, "user-1", first.ID)
	if err != nil {
		t.Fatal(err)
	}
	if stored.Source != "upload" ||
		stored.Metadata["originalFilename"] != "night-sky.png" {
		t.Fatalf("unexpected wallpaper metadata: %+v", stored)
	}
	if asset == nil || asset.Width != 4 || asset.Height != 3 ||
		asset.MediaType != "image/png" || asset.SHA256 == "" {
		t.Fatalf("unexpected media asset: %+v", asset)
	}

	var assets int
	if err := db.SQL().QueryRow("SELECT COUNT(1) FROM media_assets").Scan(&assets); err != nil {
		t.Fatal(err)
	}
	if assets != 1 {
		t.Fatalf("deduplicated media assets = %d, want 1", assets)
	}
}

func saveUpload(
	ctx context.Context,
	service *settings.Service,
	userID string,
	header *multipart.FileHeader,
) (settings.Wallpaper, error) {
	file, err := header.Open()
	if err != nil {
		return settings.Wallpaper{}, err
	}
	defer file.Close()
	return service.SaveUploadedWallpaper(ctx, userID, settings.WallpaperUpload{
		Filename:    header.Filename,
		ContentType: header.Header.Get("Content-Type"),
		ByteSize:    header.Size,
		Content:     file,
	})
}

func wallpaperHeader(t *testing.T, filename string) *multipart.FileHeader {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("wallpaper", filename)
	if err != nil {
		t.Fatal(err)
	}
	pixels := image.NewRGBA(image.Rect(0, 0, 4, 3))
	for y := 0; y < 3; y++ {
		for x := 0; x < 4; x++ {
			pixels.Set(x, y, color.RGBA{R: 15, G: 90, B: 170, A: 255})
		}
	}
	if err := png.Encode(part, pixels); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest("POST", "/", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	if err := request.ParseMultipartForm(1 << 20); err != nil {
		t.Fatal(err)
	}
	return request.MultipartForm.File["wallpaper"][0]
}

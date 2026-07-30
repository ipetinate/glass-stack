package wallpaper

import (
	"bufio"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/settings"
)

const maxWallpaperBytes = 20 << 20

type AssetStorage struct {
	directory string
	now       func() time.Time
}

func NewAssetStorage(directory string) *AssetStorage {
	return &AssetStorage{directory: directory, now: time.Now}
}

func (storage *AssetStorage) Save(
	_ context.Context,
	userID string,
	contentType string,
	source io.Reader,
	contentLength int64,
) (settings.MediaAsset, bool, error) {
	if contentLength > maxWallpaperBytes {
		return settings.MediaAsset{}, false, settings.ErrAssetTooLarge
	}
	buffered := bufio.NewReader(source)
	signature, peekErr := buffered.Peek(512)
	if peekErr != nil && peekErr != io.EOF {
		return settings.MediaAsset{}, false, fmt.Errorf("inspect wallpaper: %w", peekErr)
	}
	detectedType := strings.Split(http.DetectContentType(signature), ";")[0]
	if strings.HasPrefix(detectedType, "image/") {
		contentType = detectedType
	}
	if !supportedRasterType(contentType) {
		return settings.MediaAsset{}, false, fmt.Errorf("unsupported wallpaper media type")
	}
	if err := os.MkdirAll(storage.directory, 0o700); err != nil {
		return settings.MediaAsset{}, false, fmt.Errorf("create wallpaper directory: %w", err)
	}
	temporary, err := os.CreateTemp(storage.directory, ".wallpaper-*")
	if err != nil {
		return settings.MediaAsset{}, false, fmt.Errorf("create temporary wallpaper: %w", err)
	}
	temporaryName := temporary.Name()
	defer func() {
		_ = temporary.Close()
		_ = os.Remove(temporaryName)
	}()

	hasher := sha256.New()
	written, err := io.Copy(
		io.MultiWriter(temporary, hasher),
		io.LimitReader(buffered, maxWallpaperBytes+1),
	)
	if err != nil {
		return settings.MediaAsset{}, false, fmt.Errorf("write wallpaper: %w", err)
	}
	if written > maxWallpaperBytes {
		return settings.MediaAsset{}, false, settings.ErrAssetTooLarge
	}
	if _, err := temporary.Seek(0, io.SeekStart); err != nil {
		return settings.MediaAsset{}, false, err
	}
	config, decodedType, err := image.DecodeConfig(temporary)
	if err != nil {
		return settings.MediaAsset{}, false, fmt.Errorf("decode wallpaper dimensions: %w", err)
	}
	if config.Width <= 0 || config.Height <= 0 ||
		config.Width > 16384 || config.Height > 16384 {
		return settings.MediaAsset{}, false, fmt.Errorf("unsupported wallpaper dimensions")
	}
	contentType = "image/" + decodedType
	checksum := hex.EncodeToString(hasher.Sum(nil))
	finalPath := filepath.Join(storage.directory, checksum+extensionForContentType(contentType))
	if err := temporary.Close(); err != nil {
		return settings.MediaAsset{}, false, err
	}
	created := false
	if _, err := os.Stat(finalPath); err == nil {
		// Content-addressed bytes already exist.
	} else if !os.IsNotExist(err) {
		return settings.MediaAsset{}, false, fmt.Errorf("inspect wallpaper destination: %w", err)
	} else if err := os.Rename(temporaryName, finalPath); err != nil {
		return settings.MediaAsset{}, false, fmt.Errorf("commit wallpaper: %w", err)
	} else {
		created = true
	}
	if err := os.Chmod(finalPath, 0o600); err != nil {
		return settings.MediaAsset{}, created, fmt.Errorf("protect wallpaper: %w", err)
	}
	id, err := randomID()
	if err != nil {
		return settings.MediaAsset{}, created, err
	}
	return settings.MediaAsset{
		ID:          id,
		OwnerUserID: userID,
		Kind:        "wallpaper",
		StoragePath: finalPath,
		MediaType:   contentType,
		ByteSize:    written,
		Width:       config.Width,
		Height:      config.Height,
		SHA256:      checksum,
		CreatedAt:   storage.now().UTC(),
	}, created, nil
}

func (storage *AssetStorage) Open(
	_ context.Context,
	asset settings.MediaAsset,
) (io.ReadSeekCloser, error) {
	file, err := os.Open(asset.StoragePath)
	if os.IsNotExist(err) {
		return nil, settings.ErrAssetNotFound
	}
	return file, err
}

func (storage *AssetStorage) Remove(asset settings.MediaAsset) error {
	return os.Remove(asset.StoragePath)
}

func supportedRasterType(contentType string) bool {
	switch strings.ToLower(strings.TrimSpace(contentType)) {
	case "image/jpeg", "image/png", "image/gif":
		return true
	default:
		return false
	}
}

func extensionForContentType(contentType string) string {
	extensions, _ := mime.ExtensionsByType(contentType)
	if len(extensions) > 0 {
		return extensions[0]
	}
	return ".img"
}

func randomID() (string, error) {
	value := make([]byte, 16)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}

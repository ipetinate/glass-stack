package settings

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"
)

type Service struct {
	store            Store
	assets           AssetStorage
	provider         WallpaperProvider
	unsplashSelfHost bool
	now              func() time.Time
}

func NewService(
	store Store,
	assets AssetStorage,
	provider WallpaperProvider,
	unsplashSelfHost bool,
) *Service {
	return &Service{
		store:            store,
		assets:           assets,
		provider:         provider,
		unsplashSelfHost: unsplashSelfHost,
		now:              time.Now,
	}
}

const (
	DefaultAutoLockMinutes = 15
	maxAutoLockMinutes     = 1440

	DefaultClockVariant    = "HH:mm:ss"
	DefaultClockHourFormat = "24"
)

func DefaultPreferences() Preferences {
	return Preferences{
		SchemaVersion:  1,
		Locale:         "en-US",
		Theme:          "system",
		AvatarPresetID: "default",
		WindowAppearance: WindowAppearance{
			BackgroundMode: "solid",
			ActionVisibility: map[string]bool{
				"close":          true,
				"maximize":       true,
				"verticalExpand": true,
			},
		},
		LockScreen: LockScreenPreferences{
			AutoLockMinutes: intPointer(DefaultAutoLockMinutes),
		},
		Statusbar: StatusbarPreferences{
			Clock: ClockPreferences{
				Variant:     DefaultClockVariant,
				HourFormat:  DefaultClockHourFormat,
				ShowDate:    true,
				ShowWeekday: true,
				ShowMonth:   true,
				ShowYear:    true,
			},
			Weather: WeatherDisplayPreferences{
				ShowCondition: true,
				ShowGreeting:  true,
				ShowIcon:      true,
			},
		},
		EventSamplingSeconds: 1,
		Dashboard:            map[string]any{"version": 1},
	}
}

func normalizeStatusbar(preferences *Preferences) {
	if preferences.Statusbar.Clock.Variant == "" ||
		preferences.Statusbar.Clock.HourFormat == "" {
		preferences.Statusbar = DefaultPreferences().Statusbar
	}
}

func intPointer(value int) *int {
	return &value
}

func (service *Service) GetPreferences(
	ctx context.Context,
	userID string,
) (PreferenceRecord, error) {
	record, err := service.store.GetPreferences(ctx, userID)
	if err != nil {
		return PreferenceRecord{}, err
	}
	normalizeStatusbar(&record.Preferences)
	return record, nil
}

func (service *Service) WallpaperCapabilities() WallpaperCapabilities {
	return WallpaperCapabilities{
		UnsplashConfigured: service.provider != nil,
		UnsplashSelfHosted: service.provider != nil && service.unsplashSelfHost,
	}
}

func (service *Service) UpdatePreferences(
	ctx context.Context,
	userID string,
	revision int,
	preferences Preferences,
) (PreferenceRecord, error) {
	normalizeStatusbar(&preferences)
	if err := validatePreferences(preferences); err != nil {
		return PreferenceRecord{}, err
	}
	record := PreferenceRecord{
		UserID:      userID,
		Revision:    revision + 1,
		Preferences: preferences,
		UpdatedAt:   service.now().UTC(),
	}
	if err := service.store.UpdatePreferences(ctx, record, revision); err != nil {
		return PreferenceRecord{}, err
	}
	return record, nil
}

func (service *Service) SearchUnsplash(
	ctx context.Context,
	query string,
	page int,
) (UnsplashSearch, error) {
	if service.provider == nil {
		return UnsplashSearch{}, ErrProviderDisabled
	}
	if page < 1 {
		page = 1
	}
	return service.provider.Search(ctx, strings.TrimSpace(query), page)
}

func (service *Service) SaveUnsplashWallpaper(
	ctx context.Context,
	userID string,
	providerID string,
) (Wallpaper, error) {
	if service.provider == nil {
		return Wallpaper{}, ErrProviderDisabled
	}
	photo, err := service.provider.Get(ctx, providerID)
	if err != nil {
		return Wallpaper{}, err
	}
	if photo.ID == "" {
		return Wallpaper{}, fmt.Errorf("unsplash photo has no id")
	}
	if photo.Links.DownloadLocation != "" {
		_ = service.provider.TrackDownload(ctx, photo.Links.DownloadLocation)
	}

	wallpaperID, err := randomID()
	if err != nil {
		return Wallpaper{}, err
	}
	description := photo.AltDescription
	if description == "" {
		description = photo.Description
	}
	if description == "" {
		description = "Unsplash wallpaper"
	}
	wallpaper := Wallpaper{
		ID:               wallpaperID,
		OwnerUserID:      userID,
		Source:           "unsplash",
		ProviderID:       photo.ID,
		Title:            description,
		Description:      description,
		AuthorName:       photo.User.Name,
		AuthorURL:        photo.User.Links.HTML,
		SourceURL:        photo.URLs.Raw,
		DownloadLocation: photo.Links.DownloadLocation,
		LicenseName:      "Unsplash API Terms",
		LicenseURL:       "https://unsplash.com/api-terms",
		Metadata: map[string]any{
			"providerAuthorId": photo.User.ID,
			"providerPageUrl":  photo.Links.HTML,
			"originalWidth":    photo.Width,
			"originalHeight":   photo.Height,
			"dominantColor":    photo.Color,
			"blurHash":         photo.BlurHash,
			"selfHosted":       service.unsplashSelfHost,
			"fetchedAt":        service.now().UTC(),
		},
		CreatedAt: service.now().UTC(),
	}

	var asset *MediaAsset
	var created bool
	if service.unsplashSelfHost {
		if service.assets == nil {
			return Wallpaper{}, fmt.Errorf("wallpaper asset storage is unavailable")
		}
		content, contentType, contentLength, err := service.provider.Download(
			ctx,
			photo.URLs.Raw,
		)
		if err != nil {
			return Wallpaper{}, err
		}
		defer content.Close()
		stored, wasCreated, err := service.assets.Save(
			ctx,
			userID,
			contentType,
			content,
			contentLength,
		)
		if err != nil {
			return Wallpaper{}, err
		}
		asset = &stored
		created = wasCreated
		wallpaper.MediaAssetID = stored.ID
	}
	resolvedAssetID, err := service.store.CreateWallpaper(ctx, wallpaper, asset)
	if err != nil {
		if asset != nil && created {
			_ = service.assets.Remove(*asset)
		}
		return Wallpaper{}, fmt.Errorf("store wallpaper: %w", err)
	}
	wallpaper.MediaAssetID = resolvedAssetID
	return wallpaper, nil
}

func (service *Service) SaveUploadedWallpaper(
	ctx context.Context,
	userID string,
	upload WallpaperUpload,
) (Wallpaper, error) {
	if service.assets == nil {
		return Wallpaper{}, fmt.Errorf("wallpaper asset storage is unavailable")
	}
	asset, created, err := service.assets.Save(
		ctx,
		userID,
		upload.ContentType,
		upload.Content,
		upload.ByteSize,
	)
	if err != nil {
		return Wallpaper{}, err
	}
	wallpaperID, err := randomID()
	if err != nil {
		if created {
			_ = service.assets.Remove(asset)
		}
		return Wallpaper{}, err
	}
	filename := filepath.Base(upload.Filename)
	wallpaper := Wallpaper{
		ID:           wallpaperID,
		OwnerUserID:  userID,
		MediaAssetID: asset.ID,
		Source:       "upload",
		Title:        strings.TrimSuffix(filename, filepath.Ext(filename)),
		Description:  "Uploaded wallpaper",
		LicenseName:  "User supplied",
		Metadata: map[string]any{
			"originalFilename": filename,
			"uploadedAt":       service.now().UTC(),
		},
		CreatedAt: service.now().UTC(),
	}
	resolvedAssetID, err := service.store.CreateWallpaper(ctx, wallpaper, &asset)
	if err != nil {
		if created {
			_ = service.assets.Remove(asset)
		}
		return Wallpaper{}, fmt.Errorf("store uploaded wallpaper: %w", err)
	}
	wallpaper.MediaAssetID = resolvedAssetID
	return wallpaper, nil
}

func (service *Service) OpenWallpaper(
	ctx context.Context,
	userID string,
	wallpaperID string,
) (io.ReadSeekCloser, MediaAsset, error) {
	_, asset, err := service.store.GetWallpaper(ctx, userID, wallpaperID)
	if err != nil {
		return nil, MediaAsset{}, err
	}
	if asset == nil || asset.StoragePath == "" || service.assets == nil {
		return nil, MediaAsset{}, ErrAssetNotFound
	}
	file, err := service.assets.Open(ctx, *asset)
	if err != nil {
		return nil, MediaAsset{}, err
	}
	return file, *asset, nil
}

func (service *Service) GetWallpaper(
	ctx context.Context,
	userID string,
	wallpaperID string,
) (Wallpaper, *MediaAsset, error) {
	return service.store.GetWallpaper(ctx, userID, wallpaperID)
}

func validatePreferences(preferences Preferences) error {
	if preferences.SchemaVersion != 1 {
		return fmt.Errorf("%w: unsupported schema version", ErrInvalidPreferences)
	}
	switch preferences.Locale {
	case "pt-BR", "en-US", "fr", "de":
	default:
		return fmt.Errorf("%w: unsupported locale", ErrInvalidPreferences)
	}
	switch preferences.Theme {
	case "light", "dark", "system":
	default:
		return fmt.Errorf("%w: unsupported theme", ErrInvalidPreferences)
	}
	if preferences.EventSamplingSeconds < 1 || preferences.EventSamplingSeconds > 5 {
		return fmt.Errorf("%w: unsupported event sampling interval", ErrInvalidPreferences)
	}
	switch preferences.WindowAppearance.BackgroundMode {
	case "solid", "blur":
	default:
		return fmt.Errorf("%w: unsupported window background", ErrInvalidPreferences)
	}
	if minutes := preferences.LockScreen.AutoLockMinutes; minutes != nil {
		if *minutes < 1 || *minutes > maxAutoLockMinutes {
			return fmt.Errorf("%w: unsupported auto lock interval", ErrInvalidPreferences)
		}
	}
	switch preferences.Statusbar.Clock.Variant {
	case "HH:mm", "HH:mm:ss":
	default:
		return fmt.Errorf("%w: unsupported clock variant", ErrInvalidPreferences)
	}
	switch preferences.Statusbar.Clock.HourFormat {
	case "12", "24":
	default:
		return fmt.Errorf("%w: unsupported clock hour format", ErrInvalidPreferences)
	}
	return nil
}

func randomID() (string, error) {
	value := make([]byte, 16)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}

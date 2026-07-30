package settings

import (
	"context"
	"errors"
	"io"
	"testing"
	"time"
)

func TestWallpaperCapabilitiesReflectProviderConfiguration(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name           string
		provider       WallpaperProvider
		selfHosted     bool
		wantConfigured bool
		wantSelfHosted bool
	}{
		{
			name:           "provider disabled",
			wantConfigured: false,
		},
		{
			name:           "hotlinked provider",
			provider:       &fakeWallpaperProvider{},
			wantConfigured: true,
		},
		{
			name:           "self-hosted provider",
			provider:       &fakeWallpaperProvider{},
			selfHosted:     true,
			wantConfigured: true,
			wantSelfHosted: true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			service := NewService(nil, nil, test.provider, test.selfHosted)
			capabilities := service.WallpaperCapabilities()
			if capabilities.UnsplashConfigured != test.wantConfigured {
				t.Fatalf(
					"configured = %t, want %t",
					capabilities.UnsplashConfigured,
					test.wantConfigured,
				)
			}
			if capabilities.UnsplashSelfHosted != test.wantSelfHosted {
				t.Fatalf(
					"self hosted = %t, want %t",
					capabilities.UnsplashSelfHosted,
					test.wantSelfHosted,
				)
			}
		})
	}
}

func TestSearchUnsplashNormalizesInput(t *testing.T) {
	t.Parallel()

	provider := &fakeWallpaperProvider{
		searchResult: UnsplashSearch{TotalPages: 3},
	}
	service := NewService(nil, nil, provider, false)

	result, err := service.SearchUnsplash(context.Background(), "  mountains  ", 0)
	if err != nil {
		t.Fatal(err)
	}
	if result.TotalPages != 3 || provider.searchQuery != "mountains" ||
		provider.searchPage != 1 {
		t.Fatalf(
			"result=%+v query=%q page=%d",
			result,
			provider.searchQuery,
			provider.searchPage,
		)
	}
}

func TestSaveUnsplashWallpaperPersistsCanonicalMetadata(t *testing.T) {
	t.Parallel()

	photo := UnsplashPhoto{
		ID:             "photo-1",
		AltDescription: "Misty mountains",
		Width:          3840,
		Height:         2160,
		Color:          "#123456",
		BlurHash:       "blur",
	}
	photo.URLs.Raw = "https://images.unsplash.com/photo-1"
	photo.Links.HTML = "https://unsplash.com/photos/photo-1"
	photo.Links.DownloadLocation = "https://api.unsplash.com/photos/photo-1/download"
	photo.User.ID = "author-1"
	photo.User.Name = "Ada"
	photo.User.Links.HTML = "https://unsplash.com/@ada"

	provider := &fakeWallpaperProvider{photo: photo}
	store := &fakeStore{}
	service := NewService(store, nil, provider, false)
	service.now = func() time.Time {
		return time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	}

	wallpaper, err := service.SaveUnsplashWallpaper(
		context.Background(),
		"user-1",
		"photo-1",
	)
	if err != nil {
		t.Fatal(err)
	}
	if wallpaper.ProviderID != "photo-1" ||
		wallpaper.AuthorName != "Ada" ||
		wallpaper.SourceURL != photo.URLs.Raw ||
		wallpaper.Metadata["originalWidth"] != 3840 {
		t.Fatalf("unexpected wallpaper: %+v", wallpaper)
	}
	if provider.trackedDownload != photo.Links.DownloadLocation {
		t.Fatalf("tracked download = %q", provider.trackedDownload)
	}
	if store.createdWallpaper.OwnerUserID != "user-1" {
		t.Fatalf("stored wallpaper = %+v", store.createdWallpaper)
	}
}

func TestUpdatePreferencesValidatesAndPreservesRevision(t *testing.T) {
	t.Parallel()

	preferences := DefaultPreferences()
	store := &fakeStore{}
	service := NewService(store, nil, nil, false)

	record, err := service.UpdatePreferences(
		context.Background(),
		"user-1",
		4,
		preferences,
	)
	if err != nil {
		t.Fatal(err)
	}
	if record.Revision != 5 || store.updatedRevision != 4 {
		t.Fatalf(
			"record revision=%d expected revision=%d",
			record.Revision,
			store.updatedRevision,
		)
	}

	preferences.Theme = "neon"
	if _, err := service.UpdatePreferences(
		context.Background(),
		"user-1",
		5,
		preferences,
	); !errors.Is(err, ErrInvalidPreferences) {
		t.Fatalf("error = %v, want ErrInvalidPreferences", err)
	}
}

type fakeWallpaperProvider struct {
	photo           UnsplashPhoto
	searchResult    UnsplashSearch
	searchQuery     string
	searchPage      int
	trackedDownload string
}

func (provider *fakeWallpaperProvider) Search(
	_ context.Context,
	stringValue string,
	page int,
) (UnsplashSearch, error) {
	provider.searchQuery = stringValue
	provider.searchPage = page
	return provider.searchResult, nil
}

func (provider *fakeWallpaperProvider) Get(
	context.Context,
	string,
) (UnsplashPhoto, error) {
	return provider.photo, nil
}

func (provider *fakeWallpaperProvider) TrackDownload(
	_ context.Context,
	endpoint string,
) error {
	provider.trackedDownload = endpoint
	return nil
}

func (*fakeWallpaperProvider) Download(
	context.Context,
	string,
) (io.ReadCloser, string, int64, error) {
	return nil, "", 0, nil
}

type fakeStore struct {
	createdWallpaper Wallpaper
	updatedRevision  int
}

func (*fakeStore) GetPreferences(
	context.Context,
	string,
) (PreferenceRecord, error) {
	return PreferenceRecord{}, nil
}

func (store *fakeStore) UpdatePreferences(
	_ context.Context,
	_ PreferenceRecord,
	revision int,
) error {
	store.updatedRevision = revision
	return nil
}

func (store *fakeStore) CreateWallpaper(
	_ context.Context,
	wallpaper Wallpaper,
	_ *MediaAsset,
) (string, error) {
	store.createdWallpaper = wallpaper
	return wallpaper.MediaAssetID, nil
}

func (*fakeStore) GetWallpaper(
	context.Context,
	string,
	string,
) (Wallpaper, *MediaAsset, error) {
	return Wallpaper{}, nil, ErrAssetNotFound
}

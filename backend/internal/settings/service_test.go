package settings

import (
	"context"
	"io"
	"testing"
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
			provider:       fakeWallpaperProvider{},
			wantConfigured: true,
		},
		{
			name:           "self-hosted provider",
			provider:       fakeWallpaperProvider{},
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

type fakeWallpaperProvider struct{}

func (fakeWallpaperProvider) Search(
	context.Context,
	string,
	int,
) (UnsplashSearch, error) {
	return UnsplashSearch{}, nil
}

func (fakeWallpaperProvider) Get(
	context.Context,
	string,
) (UnsplashPhoto, error) {
	return UnsplashPhoto{}, nil
}

func (fakeWallpaperProvider) TrackDownload(context.Context, string) error {
	return nil
}

func (fakeWallpaperProvider) Download(
	context.Context,
	string,
) (io.ReadCloser, string, int64, error) {
	return nil, "", 0, nil
}

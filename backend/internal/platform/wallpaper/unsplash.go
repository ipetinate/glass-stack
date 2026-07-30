package wallpaper

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/settings"
)

type Unsplash struct {
	accessKey   string
	apiClient   *http.Client
	imageClient *http.Client
}

func NewUnsplash(accessKey string) settings.WallpaperProvider {
	if strings.TrimSpace(accessKey) == "" {
		return nil
	}
	return &Unsplash{
		accessKey:   accessKey,
		apiClient:   restrictedClient("api.unsplash.com"),
		imageClient: restrictedClient("images.unsplash.com"),
	}
}

func (provider *Unsplash) Search(
	ctx context.Context,
	query string,
	page int,
) (settings.UnsplashSearch, error) {
	endpoint, _ := url.Parse("https://api.unsplash.com/search/photos")
	values := endpoint.Query()
	values.Set("query", query)
	values.Set("page", fmt.Sprint(page))
	values.Set("per_page", "20")
	values.Set("orientation", "landscape")
	values.Set("content_filter", "high")
	endpoint.RawQuery = values.Encode()

	var result settings.UnsplashSearch
	if err := provider.getJSON(ctx, endpoint.String(), &result); err != nil {
		return settings.UnsplashSearch{}, err
	}
	for index := range result.Results {
		normalizePhoto(&result.Results[index])
	}
	return result, nil
}

func (provider *Unsplash) Get(
	ctx context.Context,
	id string,
) (settings.UnsplashPhoto, error) {
	var photo settings.UnsplashPhoto
	if err := provider.getJSON(
		ctx,
		"https://api.unsplash.com/photos/"+url.PathEscape(id),
		&photo,
	); err != nil {
		return settings.UnsplashPhoto{}, err
	}
	normalizePhoto(&photo)
	return photo, nil
}

func (provider *Unsplash) TrackDownload(ctx context.Context, endpoint string) error {
	var ignored map[string]any
	return provider.getJSON(ctx, endpoint, &ignored)
}

func (provider *Unsplash) Download(
	ctx context.Context,
	sourceURL string,
) (io.ReadCloser, string, int64, error) {
	parsed, err := url.Parse(sourceURL)
	if err != nil || parsed.Scheme != "https" ||
		!strings.EqualFold(parsed.Hostname(), "images.unsplash.com") {
		return nil, "", 0, fmt.Errorf("refuse untrusted wallpaper source")
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, sourceURL, nil)
	if err != nil {
		return nil, "", 0, err
	}
	response, err := provider.imageClient.Do(request)
	if err != nil {
		return nil, "", 0, fmt.Errorf("download wallpaper: %w", err)
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		response.Body.Close()
		return nil, "", 0, fmt.Errorf("wallpaper source returned status %d", response.StatusCode)
	}
	if response.ContentLength > maxWallpaperBytes {
		response.Body.Close()
		return nil, "", 0, settings.ErrAssetTooLarge
	}
	return response.Body,
		strings.Split(response.Header.Get("Content-Type"), ";")[0],
		response.ContentLength,
		nil
}

func (provider *Unsplash) getJSON(
	ctx context.Context,
	endpoint string,
	target any,
) error {
	parsed, err := url.Parse(endpoint)
	if err != nil || parsed.Scheme != "https" ||
		!strings.EqualFold(parsed.Hostname(), "api.unsplash.com") {
		return fmt.Errorf("refuse untrusted Unsplash API endpoint")
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Client-ID "+provider.accessKey)
	request.Header.Set("Accept-Version", "v1")
	response, err := provider.apiClient.Do(request)
	if err != nil {
		return fmt.Errorf("request unsplash: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("unsplash returned status %d", response.StatusCode)
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 4<<20)).Decode(target); err != nil {
		return fmt.Errorf("decode unsplash response: %w", err)
	}
	return nil
}

func normalizePhoto(photo *settings.UnsplashPhoto) {
	photo.URLs.Raw = optimizedURL(photo.URLs.Raw)
	photo.User.Links.HTML = attributionURL(photo.User.Links.HTML)
}

func optimizedURL(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	values := parsed.Query()
	values.Set("w", "3840")
	values.Set("fit", "crop")
	values.Set("crop", "entropy")
	values.Set("fm", "jpg")
	values.Set("q", "85")
	parsed.RawQuery = values.Encode()
	return parsed.String()
}

func attributionURL(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	values := parsed.Query()
	values.Set("utm_source", "glass_stack")
	values.Set("utm_medium", "referral")
	parsed.RawQuery = values.Encode()
	return parsed.String()
}

func restrictedClient(host string) *http.Client {
	return &http.Client{
		Timeout: 20 * time.Second,
		CheckRedirect: func(request *http.Request, via []*http.Request) error {
			if len(via) >= 5 || request.URL.Scheme != "https" ||
				!strings.EqualFold(request.URL.Hostname(), host) {
				return fmt.Errorf("refuse redirect outside %s", host)
			}
			return nil
		},
	}
}

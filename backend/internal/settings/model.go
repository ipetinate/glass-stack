package settings

import (
	"context"
	"errors"
	"io"
	"time"
)

var (
	ErrInvalidPreferences = errors.New("invalid preferences")
	ErrRevisionConflict   = errors.New("preference revision conflict")
	ErrProviderDisabled   = errors.New("wallpaper provider is not configured")
	ErrAssetTooLarge      = errors.New("wallpaper asset is too large")
	ErrAssetNotFound      = errors.New("wallpaper asset is not available")
)

type WindowAppearance struct {
	BackgroundMode   string          `json:"backgroundMode"`
	ActionVisibility map[string]bool `json:"actionVisibility"`
}

type Preferences struct {
	SchemaVersion        int              `json:"schemaVersion"`
	Locale               string           `json:"locale"`
	Theme                string           `json:"theme"`
	AvatarPresetID       string           `json:"avatarPresetId"`
	AvatarURL            string           `json:"avatarUrl,omitempty"`
	DisplayName          string           `json:"displayName,omitempty"`
	WallpaperID          string           `json:"wallpaperId,omitempty"`
	WindowAppearance     WindowAppearance `json:"windowAppearance"`
	EventSamplingSeconds int              `json:"eventSamplingSeconds"`
	Dashboard            map[string]any   `json:"dashboard,omitempty"`
}

type PreferenceRecord struct {
	UserID      string      `json:"userId"`
	Revision    int         `json:"revision"`
	Preferences Preferences `json:"preferences"`
	UpdatedAt   time.Time   `json:"updatedAt"`
}

type MediaAsset struct {
	ID          string    `json:"id"`
	OwnerUserID string    `json:"-"`
	Kind        string    `json:"kind"`
	StoragePath string    `json:"-"`
	MediaType   string    `json:"mediaType"`
	ByteSize    int64     `json:"byteSize"`
	Width       int       `json:"width"`
	Height      int       `json:"height"`
	SHA256      string    `json:"sha256"`
	CreatedAt   time.Time `json:"createdAt"`
}

type Wallpaper struct {
	ID               string         `json:"id"`
	OwnerUserID      string         `json:"-"`
	MediaAssetID     string         `json:"mediaAssetId,omitempty"`
	Source           string         `json:"source"`
	ProviderID       string         `json:"providerId,omitempty"`
	Title            string         `json:"title"`
	Description      string         `json:"description"`
	AuthorName       string         `json:"authorName,omitempty"`
	AuthorURL        string         `json:"authorUrl,omitempty"`
	SourceURL        string         `json:"sourceUrl,omitempty"`
	DownloadLocation string         `json:"downloadLocation,omitempty"`
	LicenseName      string         `json:"licenseName,omitempty"`
	LicenseURL       string         `json:"licenseUrl,omitempty"`
	Metadata         map[string]any `json:"metadata"`
	CreatedAt        time.Time      `json:"createdAt"`
}

type WallpaperUpload struct {
	Filename    string
	ContentType string
	ByteSize    int64
	Content     io.Reader
}

type UnsplashPhoto struct {
	ID             string `json:"id"`
	Description    string `json:"description"`
	AltDescription string `json:"alt_description"`
	Width          int    `json:"width"`
	Height         int    `json:"height"`
	Color          string `json:"color"`
	BlurHash       string `json:"blur_hash"`
	URLs           struct {
		Raw     string `json:"raw"`
		Regular string `json:"regular"`
		Small   string `json:"small"`
	} `json:"urls"`
	Links struct {
		HTML             string `json:"html"`
		DownloadLocation string `json:"download_location"`
	} `json:"links"`
	User struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Links struct {
			HTML string `json:"html"`
		} `json:"links"`
	} `json:"user"`
}

type UnsplashSearch struct {
	Results    []UnsplashPhoto `json:"results"`
	TotalPages int             `json:"total_pages"`
}

type WallpaperCapabilities struct {
	UnsplashConfigured bool `json:"unsplashConfigured"`
	UnsplashSelfHosted bool `json:"unsplashSelfHosted"`
}

type AssetStorage interface {
	Save(context.Context, string, string, io.Reader, int64) (MediaAsset, bool, error)
	Open(context.Context, MediaAsset) (io.ReadSeekCloser, error)
	Remove(MediaAsset) error
}

type WallpaperProvider interface {
	Search(context.Context, string, int) (UnsplashSearch, error)
	Get(context.Context, string) (UnsplashPhoto, error)
	TrackDownload(context.Context, string) error
	Download(context.Context, string) (io.ReadCloser, string, int64, error)
}

type Store interface {
	GetPreferences(context.Context, string) (PreferenceRecord, error)
	UpdatePreferences(context.Context, PreferenceRecord, int) error
	CreateWallpaper(context.Context, Wallpaper, *MediaAsset) (string, error)
	GetWallpaper(context.Context, string, string) (Wallpaper, *MediaAsset, error)
}

package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/ipetinate/glass-stack/backend/internal/settings"
)

type SettingsHandler struct {
	service *settings.Service
}

func NewSettingsHandler(service *settings.Service) *SettingsHandler {
	return &SettingsHandler{service: service}
}

func (handler *SettingsHandler) WallpaperCapabilities(
	response http.ResponseWriter,
	_ *http.Request,
) {
	writeJSON(
		response,
		http.StatusOK,
		handler.service.WallpaperCapabilities(),
	)
}

func (handler *SettingsHandler) GetPreferences(
	response http.ResponseWriter,
	request *http.Request,
	userID string,
) {
	record, err := handler.service.GetPreferences(request.Context(), userID)
	if err != nil {
		writeSettingsError(response, request, err)
		return
	}
	writeJSON(response, http.StatusOK, record)
}

func (handler *SettingsHandler) UpdatePreferences(
	response http.ResponseWriter,
	request *http.Request,
	userID string,
) {
	var input struct {
		Revision    int                  `json:"revision"`
		Preferences settings.Preferences `json:"preferences"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeSettingsError(response, request, settings.ErrInvalidPreferences)
		return
	}
	record, err := handler.service.UpdatePreferences(
		request.Context(),
		userID,
		input.Revision,
		input.Preferences,
	)
	if err != nil {
		writeSettingsError(response, request, err)
		return
	}
	writeJSON(response, http.StatusOK, record)
}

func (handler *SettingsHandler) SearchWallpapers(
	response http.ResponseWriter,
	request *http.Request,
) {
	page, _ := strconv.Atoi(request.URL.Query().Get("page"))
	result, err := handler.service.SearchUnsplash(
		request.Context(),
		request.URL.Query().Get("q"),
		page,
	)
	if err != nil {
		writeSettingsError(response, request, err)
		return
	}
	writeJSON(response, http.StatusOK, result)
}

func (handler *SettingsHandler) SaveUnsplash(
	response http.ResponseWriter,
	request *http.Request,
	userID string,
) {
	var input struct {
		ProviderID string `json:"providerId"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeSettingsError(response, request, settings.ErrInvalidPreferences)
		return
	}
	wallpaper, err := handler.service.SaveUnsplashWallpaper(
		request.Context(),
		userID,
		input.ProviderID,
	)
	if err != nil {
		writeSettingsError(response, request, err)
		return
	}
	writeJSON(response, http.StatusCreated, wallpaper)
}

func (handler *SettingsHandler) UploadWallpaper(
	response http.ResponseWriter,
	request *http.Request,
	userID string,
) {
	request.Body = http.MaxBytesReader(response, request.Body, (20<<20)+(1<<20))
	if err := request.ParseMultipartForm(20 << 20); err != nil {
		writeSettingsError(response, request, settings.ErrAssetTooLarge)
		return
	}
	file, header, err := request.FormFile("wallpaper")
	if err != nil {
		writeSettingsError(response, request, settings.ErrInvalidPreferences)
		return
	}
	defer file.Close()
	wallpaper, err := handler.service.SaveUploadedWallpaper(
		request.Context(),
		userID,
		settings.WallpaperUpload{
			Filename:    header.Filename,
			ContentType: header.Header.Get("Content-Type"),
			ByteSize:    header.Size,
			Content:     file,
		},
	)
	if err != nil {
		writeSettingsError(response, request, err)
		return
	}
	writeJSON(response, http.StatusCreated, wallpaper)
}

func (handler *SettingsHandler) WallpaperMedia(
	response http.ResponseWriter,
	request *http.Request,
	userID string,
	wallpaperID string,
) {
	file, asset, err := handler.service.OpenWallpaper(
		request.Context(),
		userID,
		wallpaperID,
	)
	if err != nil {
		writeSettingsError(response, request, err)
		return
	}
	defer file.Close()
	response.Header().Set("Content-Type", asset.MediaType)
	response.Header().Set("ETag", `"`+asset.SHA256+`"`)
	response.Header().Set("Cache-Control", "private, max-age=31536000, immutable")
	http.ServeContent(response, request, asset.ID, asset.CreatedAt, file)
}

func (handler *SettingsHandler) GetWallpaper(
	response http.ResponseWriter,
	request *http.Request,
	userID string,
	wallpaperID string,
) {
	wallpaper, asset, err := handler.service.GetWallpaper(
		request.Context(),
		userID,
		wallpaperID,
	)
	if err != nil {
		writeSettingsError(response, request, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{
		"wallpaper": wallpaper,
		"asset":     asset,
	})
}

func writeSettingsError(
	response http.ResponseWriter,
	request *http.Request,
	err error,
) {
	status, code, message := http.StatusInternalServerError, "internal_error", "The request could not be completed."
	switch {
	case errors.Is(err, settings.ErrInvalidPreferences):
		status, code, message = http.StatusUnprocessableEntity, "invalid_preferences", err.Error()
	case errors.Is(err, settings.ErrRevisionConflict):
		status, code, message = http.StatusConflict, "revision_conflict", "Preferences changed in another session."
	case errors.Is(err, settings.ErrProviderDisabled):
		status, code, message = http.StatusServiceUnavailable, "provider_disabled", "The wallpaper provider is not configured."
	case errors.Is(err, settings.ErrAssetTooLarge):
		status, code, message = http.StatusRequestEntityTooLarge, "asset_too_large", "The wallpaper is too large."
	case errors.Is(err, settings.ErrAssetNotFound):
		status, code, message = http.StatusNotFound, "asset_not_found", "The wallpaper asset is not available."
	}
	writeJSON(response, status, map[string]any{
		"code":      code,
		"message":   message,
		"requestId": request.Header.Get("X-Request-ID"),
	})
}

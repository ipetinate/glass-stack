package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/ipetinate/glass-stack/backend/internal/apps"
)

// AppsService is the install surface the app routes depend on. It is
// implemented by apps.Installer.
type AppsService interface {
	Install(context.Context, apps.InstallRequest) (apps.Operation, error)
	Operation(context.Context, string) (apps.InstallOperation, error)
	Update(context.Context, string) (apps.Operation, error)
	Edit(context.Context, string, string, apps.InstallOptions) (apps.Operation, error)
	Remove(context.Context, apps.RemoveRequest) (apps.Operation, error)
	Apps(context.Context) ([]apps.InstalledApp, error)
	App(context.Context, string) (apps.InstalledApp, error)
}

// AppsList returns every installed app. GET /api/v1/apps.
func AppsList(service AppsService) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		appsList, err := service.Apps(request.Context())
		if err != nil {
			writeInstallError(response, request, err)
			return
		}
		if appsList == nil {
			appsList = []apps.InstalledApp{}
		}
		writeJSON(response, http.StatusOK, map[string]any{"data": appsList})
	}
}

// AppDetail returns one installed app. GET /api/v1/apps/{appId}.
func AppDetail(service AppsService) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		appID := chi.URLParam(request, "appId")
		installedApp, err := service.App(request.Context(), appID)
		if err != nil {
			if errors.Is(err, apps.ErrNotInstalled) || errors.Is(err, apps.ErrNotFound) {
				writeDockerError(
					response,
					request,
					http.StatusNotFound,
					"app_not_installed",
					"O aplicativo não está instalado.",
				)
				return
			}
			writeInstallError(response, request, err)
			return
		}
		writeJSON(response, http.StatusOK, map[string]any{"data": installedApp})
	}
}

// InstallApp queues an app install. POST /api/v1/apps/install.
func InstallApp(service AppsService) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		var input struct {
			AppID   string `json:"appId"`
			Mode    string `json:"mode"`
			Options struct {
				Port   int    `json:"port"`
				Volume string `json:"volume"`
			} `json:"options"`
		}
		decoder := json.NewDecoder(request.Body)
		if err := decoder.Decode(&input); err != nil {
			writeDockerError(
				response,
				request,
				http.StatusBadRequest,
				"invalid_input",
				"corpo JSON inválido",
			)
			return
		}

		options := apps.InstallOptions{
			Port:   input.Options.Port,
			Volume: input.Options.Volume,
		}
		operation, err := service.Install(request.Context(), apps.InstallRequest{
			AppID:   input.AppID,
			Mode:    input.Mode,
			Options: options,
		})
		if err != nil {
			writeInstallError(response, request, err)
			return
		}
		writeJSON(response, http.StatusAccepted, map[string]any{
			"data": apps.ProjectOperation(operation),
		})
	}
}

// InstallOperationStatus returns the current projection of an install
// operation. GET /api/v1/apps/install/{operationId}.
func InstallOperationStatus(service AppsService) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		operationID := chi.URLParam(request, "operationId")
		operation, err := service.Operation(request.Context(), operationID)
		if err != nil {
			writeInstallError(response, request, err)
			return
		}
		writeJSON(response, http.StatusOK, map[string]any{"data": operation})
	}
}

// UpdateApp re-applies an installed app from its persisted options.
// POST /api/v1/apps/{appId}/update.
func UpdateApp(service AppsService) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		appID := chi.URLParam(request, "appId")
		operation, err := service.Update(request.Context(), appID)
		if err != nil {
			writeInstallError(response, request, err)
			return
		}
		writeJSON(response, http.StatusAccepted, map[string]any{
			"data": apps.ProjectOperation(operation),
		})
	}
}

// EditApp re-applies an installed app with new options.
// PATCH /api/v1/apps/{appId}.
func EditApp(service AppsService) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		appID := chi.URLParam(request, "appId")
		var input struct {
			Mode    string `json:"mode"`
			Options struct {
				Port   int    `json:"port"`
				Volume string `json:"volume"`
			} `json:"options"`
		}
		decoder := json.NewDecoder(request.Body)
		if err := decoder.Decode(&input); err != nil {
			writeDockerError(
				response,
				request,
				http.StatusBadRequest,
				"invalid_input",
				"corpo JSON inválido",
			)
			return
		}
		options := apps.InstallOptions{
			Port:   input.Options.Port,
			Volume: input.Options.Volume,
		}
		operation, err := service.Edit(request.Context(), appID, input.Mode, options)
		if err != nil {
			writeInstallError(response, request, err)
			return
		}
		writeJSON(response, http.StatusAccepted, map[string]any{
			"data": apps.ProjectOperation(operation),
		})
	}
}

// RemoveApp tears down an installed app. POST /api/v1/apps/{appId}/remove.
func RemoveApp(service AppsService) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		appID := chi.URLParam(request, "appId")
		var input struct {
			Containers bool `json:"containers"`
			Images     bool `json:"images"`
			Config     bool `json:"config"`
			Data       bool `json:"data"`
		}
		decoder := json.NewDecoder(request.Body)
		if err := decoder.Decode(&input); err != nil {
			writeDockerError(
				response,
				request,
				http.StatusBadRequest,
				"invalid_input",
				"corpo JSON inválido",
			)
			return
		}
		operation, err := service.Remove(request.Context(), apps.RemoveRequest{
			AppID:      appID,
			Containers: input.Containers,
			Images:     input.Images,
			Config:     input.Config,
			Data:       input.Data,
		})
		if err != nil {
			writeInstallError(response, request, err)
			return
		}
		writeJSON(response, http.StatusAccepted, map[string]any{
			"data": apps.ProjectOperation(operation),
		})
	}
}

func writeInstallError(
	response http.ResponseWriter,
	request *http.Request,
	err error,
) {
	switch {
	case errors.Is(err, apps.ErrApplicationNotFound):
		writeDockerError(
			response,
			request,
			http.StatusNotFound,
			"app_not_found",
			"O aplicativo não existe no catálogo.",
		)
	case errors.Is(err, apps.ErrAlreadyInstalled):
		writeDockerError(
			response,
			request,
			http.StatusConflict,
			"app_already_installed",
			"O aplicativo já está instalado.",
		)
	case errors.Is(err, apps.ErrInstallInProgress):
		writeDockerError(
			response,
			request,
			http.StatusConflict,
			"install_in_progress",
			"Uma instalação deste aplicativo já está em andamento.",
		)
	case errors.Is(err, apps.ErrNotInstalled):
		writeDockerError(
			response,
			request,
			http.StatusConflict,
			"app_not_installed",
			"O aplicativo não está instalado.",
		)
	case errors.Is(err, apps.ErrUpdateInProgress):
		writeDockerError(
			response,
			request,
			http.StatusConflict,
			"update_in_progress",
			"Uma atualização deste aplicativo já está em andamento.",
		)
	case errors.Is(err, apps.ErrEditInProgress):
		writeDockerError(
			response,
			request,
			http.StatusConflict,
			"edit_in_progress",
			"Uma edição deste aplicativo já está em andamento.",
		)
	case errors.Is(err, apps.ErrRemoveInProgress):
		writeDockerError(
			response,
			request,
			http.StatusConflict,
			"remove_in_progress",
			"Uma remoção deste aplicativo já está em andamento.",
		)
	case errors.Is(err, apps.ErrRemoveNeedsConfirmation):
		writeDockerError(
			response,
			request,
			http.StatusBadRequest,
			"remove_confirmation_required",
			"Confirme ao menos a remoção dos contêineres.",
		)
	case errors.Is(err, apps.ErrInvalidOptions):
		writeDockerError(
			response,
			request,
			http.StatusBadRequest,
			"invalid_input",
			err.Error(),
		)
	case errors.Is(err, apps.ErrUnsupportedMode):
		writeDockerError(
			response,
			request,
			http.StatusBadRequest,
			"unsupported_mode",
			err.Error(),
		)
	case errors.Is(err, apps.ErrNotFound):
		writeDockerError(
			response,
			request,
			http.StatusNotFound,
			"operation_not_found",
			"Operação de instalação não encontrada.",
		)
	default:
		writeDockerError(
			response,
			request,
			http.StatusInternalServerError,
			"install_error",
			err.Error(),
		)
	}
}

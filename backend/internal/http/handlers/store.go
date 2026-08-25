package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"

	"github.com/ipetinate/glass-stack/backend/internal/observability"
	"github.com/ipetinate/glass-stack/backend/internal/store"
)

type StoreHandler struct {
	service *store.Service
	logger  *slog.Logger
}

func NewStoreHandler(service *store.Service, logger *slog.Logger) *StoreHandler {
	return &StoreHandler{service: service, logger: logger}
}

func (handler *StoreHandler) Catalog(response http.ResponseWriter, request *http.Request) {
	applications, err := handler.service.Catalog(request.Context())
	if err != nil {
		writeStoreError(
			response,
			request,
			http.StatusInternalServerError,
			"store_unavailable",
			"Não foi possível carregar o catálogo de aplicativos.",
		)
		return
	}
	writeJSON(response, http.StatusOK, applications)
}

func (handler *StoreHandler) Application(response http.ResponseWriter, request *http.Request) {
	application, err := handler.service.Application(
		request.Context(),
		chi.URLParam(request, "appID"),
	)
	if err != nil {
		if err == store.ErrApplicationNotFound {
			writeStoreError(response, request, http.StatusNotFound, "not_found", "Aplicativo não encontrado.")
			return
		}
		writeStoreError(response, request, http.StatusInternalServerError, "store_unavailable", "Não foi possível carregar o aplicativo.")
		return
	}
	writeJSON(response, http.StatusOK, application)
}

func (handler *StoreHandler) Sync(response http.ResponseWriter, request *http.Request) {
	summary, err := handler.service.Sync(request.Context())
	if err != nil {
		if handler.logger != nil {
			handler.logger.Warn("manual store sync failed", "error", err.Error())
		}
		writeStoreError(response, request, http.StatusBadGateway, "sync_failed", "A sincronização da loja falhou. Tente novamente mais tarde.")
		return
	}
	writeJSON(response, http.StatusOK, summary)
}

func (handler *StoreHandler) Asset(response http.ResponseWriter, request *http.Request) {
	appID := chi.URLParam(request, "appID")
	file := filepath.Base(chi.URLParam(request, "file"))
	root, err := handler.service.AssetRoot(appID)
	if err != nil || root == "" {
		http.NotFound(response, request)
		return
	}
	target := filepath.Join(root, file)
	if info, infoErr := os.Stat(target); infoErr != nil || info.IsDir() {
		http.NotFound(response, request)
		return
	}
	http.ServeFile(response, request, target)
}

func writeStoreError(
	response http.ResponseWriter,
	request *http.Request,
	status int,
	code string,
	message string,
) {
	response.Header().Set("Content-Type", "application/json")
	response.WriteHeader(status)
	_ = json.NewEncoder(response).Encode(map[string]any{
		"code":      code,
		"message":   message,
		"requestId": observability.RequestID(request.Context()),
	})
}

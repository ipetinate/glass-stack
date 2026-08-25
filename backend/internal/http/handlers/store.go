package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/ipetinate/glass-stack/backend/internal/observability"
	"github.com/ipetinate/glass-stack/backend/internal/store"
)

type StoreHandler struct {
	service    *store.Service
	logger     *slog.Logger
	authorFrom func(ctx context.Context) string
}

func NewStoreHandler(
	service *store.Service,
	logger *slog.Logger,
	authorFrom func(ctx context.Context) string,
) *StoreHandler {
	if authorFrom == nil {
		authorFrom = func(context.Context) string { return "" }
	}
	return &StoreHandler{service: service, logger: logger, authorFrom: authorFrom}
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

func (handler *StoreHandler) CreateReview(response http.ResponseWriter, request *http.Request) {
	appID := chi.URLParam(request, "appID")
	var payload struct {
		Rating  int    `json:"rating"`
		Comment string `json:"comment"`
	}
	if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
		writeStoreError(response, request, http.StatusBadRequest, "invalid_payload", "Avaliação inválida.")
		return
	}
	author := handler.authorFrom(request.Context())
	fallbackAuthor := author
	if fallbackAuthor == "" {
		fallbackAuthor = "Anônimo"
	}
	err := handler.service.CreateReview(
		request.Context(),
		appID,
		payload.Rating,
		payload.Comment,
		fallbackAuthor,
	)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrInvalidReview):
			writeStoreError(response, request, http.StatusBadRequest, "invalid_review", "Informe uma nota de 1 a 5 estrelas e um comentário.")
		case errors.Is(err, store.ErrServerTokenRequired):
			writeStoreError(
				response,
				request,
				http.StatusUnauthorized,
				"review_login_required",
				"Entre com GitHub ou Google para publicar sua avaliação.",
			)
		case errors.Is(err, store.ErrReviewsUnavailable):
			writeStoreError(
				response,
				request,
				http.StatusServiceUnavailable,
				"reviews_unavailable",
				"Avaliações indisponíveis: verifique a configuração de login no servidor.",
			)
		default:
			writeStoreError(response, request, http.StatusInternalServerError, "review_failed", "Não foi possível publicar a avaliação.")
		}
		return
	}
	application, err := handler.service.Application(request.Context(), appID)
	if err != nil {
		writeJSON(response, http.StatusCreated, map[string]string{"status": "created"})
		return
	}
	writeJSON(response, http.StatusCreated, application)
}

func (handler *StoreHandler) ReviewSession(response http.ResponseWriter, request *http.Request) {
	writeJSON(response, http.StatusOK, handler.service.ReviewSession())
}

func (handler *StoreHandler) StartReviewLogin(response http.ResponseWriter, request *http.Request) {
	var payload struct {
		Provider string `json:"provider"`
	}
	if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
		writeStoreError(response, request, http.StatusBadRequest, "invalid_payload", "Solicitação inválida.")
		return
	}
	snapshot, err := handler.service.StartReviewLogin(strings.TrimSpace(payload.Provider))
	if err != nil {
		switch {
		case errors.Is(err, store.ErrClientIDMissing):
			writeStoreError(
				response,
				request,
				http.StatusServiceUnavailable,
				"reviews_login_unavailable",
				"Login para avaliações não configurado no servidor (GLASS_GITHUB_CLIENT_ID ou GLASS_GOOGLE_CLIENT_ID).",
			)
		case errors.Is(err, store.ErrReviewsUnavailable):
			writeStoreError(response, request, http.StatusBadGateway, "reviews_login_failed", "Não foi possível iniciar o login: "+err.Error())
		default:
			writeStoreError(response, request, http.StatusInternalServerError, "reviews_login_failed", "Não foi possível iniciar o login.")
		}
		return
	}
	writeJSON(response, http.StatusOK, snapshot)
}

func (handler *StoreHandler) CancelReviewLogin(response http.ResponseWriter, request *http.Request) {
	writeJSON(response, http.StatusOK, handler.service.CancelReviewLogin())
}

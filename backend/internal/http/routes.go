package httpserver

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/ipetinate/glass-stack/backend/internal/http/handlers"
)

func NewRouter() http.Handler {
	router := chi.NewRouter()

	router.Get("/health", handlers.Health)

	return router
}

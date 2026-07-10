package httpserver

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

func NewRouter() http.Handler {
	router := chi.NewRouter()

	router.Get("/health", func(writer http.ResponseWriter, request *http.Request) {
		writer.Write([]byte("OK"))
	})

	return router
}

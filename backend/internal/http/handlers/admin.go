package handlers

import (
	"context"
	"net/http"
)

type AdminHandler struct {
	database DatabaseResetter
}

type DatabaseResetter interface {
	DropAllTables(ctx context.Context) error
}

func NewAdminHandler(database DatabaseResetter) *AdminHandler {
	return &AdminHandler{database: database}
}

func (handler *AdminHandler) ResetSystem(response http.ResponseWriter, request *http.Request) {
	if err := handler.database.DropAllTables(request.Context()); err != nil {
		writeJSON(response, http.StatusInternalServerError, map[string]string{
			"error":   "reset_failed",
			"message": "The system reset could not be completed.",
		})
		return
	}

	writeJSON(response, http.StatusOK, map[string]string{
		"status":  "reset",
		"message": "System has been reset. Redirecting to onboarding.",
	})
}

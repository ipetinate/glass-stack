package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"

	systeminfo "github.com/ipetinate/glass-stack/backend/internal/system"
)

type HostReader interface {
	Read(context.Context) (systeminfo.HostSnapshot, error)
}

func Host(reader HostReader) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		snapshot, err := reader.Read(request.Context())
		if err != nil {
			slog.Warn("failed to collect some host information", "error", err)
		}

		response.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(response).Encode(snapshot); err != nil {
			slog.Warn("failed to write host response", "error", err)
		}
	}
}

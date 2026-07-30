package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/ipetinate/glass-stack/backend/internal/observability"
	systeminfo "github.com/ipetinate/glass-stack/backend/internal/system"
)

type StorageReader interface {
	Read(context.Context) (systeminfo.StorageSnapshot, error)
}

func Storage(reader StorageReader) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		snapshot, err := reader.Read(request.Context())
		if err != nil {
			writeJSON(response, http.StatusInternalServerError, map[string]any{
				"code":      "storage_unavailable",
				"message":   "Storage information is temporarily unavailable.",
				"requestId": observability.RequestID(request.Context()),
			})
			return
		}
		response.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(response).Encode(snapshot)
	}
}

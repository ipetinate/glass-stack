package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	systeminfo "github.com/ipetinate/glass-stack/backend/internal/system"
)

type StorageReader interface {
	Read(context.Context) (systeminfo.StorageSnapshot, error)
}

func Storage(reader StorageReader) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		snapshot, err := reader.Read(request.Context())
		if err != nil {
			http.Error(response, err.Error(), http.StatusInternalServerError)
			return
		}
		response.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(response).Encode(snapshot)
	}
}

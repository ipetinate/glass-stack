package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

type HealthResponse struct {
	Status string `json:"status"`
}

func Health(response http.ResponseWriter, request *http.Request) {
	response.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(response).Encode(HealthResponse{
		Status: "ok",
	}); err != nil {
		slog.Error("failed to write response", "error", err)
	}
}

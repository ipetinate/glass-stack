package handlers_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ipetinate/glass-stack/backend/internal/http/handlers"
)

func TestHealthHandler(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	response := httptest.NewRecorder()

	handlers.Health(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("Expected status %d, got %d", http.StatusOK, response.Code)
	}

	if contentType := response.Header().Get("Content-Type"); contentType != "application/json" {
		t.Fatalf("Expected Content-Type 'application/json', got %q", contentType)
	}

	var body handlers.HealthResponse

	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if body.Status != "ok" {
		t.Fatalf("Expected status 'ok', got %q", body.Status)
	}
}

package httpserver

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCORSAllowsDevelopmentOrigin(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	request.Header.Set("Origin", "http://localhost:5173")
	response := httptest.NewRecorder()

	NewRouter().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	if origin := response.Header().Get("Access-Control-Allow-Origin"); origin != "http://localhost:5173" {
		t.Fatalf("expected allowed origin header, got %q", origin)
	}

	if credentials := response.Header().Get("Access-Control-Allow-Credentials"); credentials != "true" {
		t.Fatalf("expected credentials header, got %q", credentials)
	}

	if vary := response.Header().Values("Vary"); !containsHeaderValue(vary, "Origin") {
		t.Fatalf("expected Vary to contain Origin, got %q", vary)
	}
}

func TestCORSDoesNotAllowUnknownOrigin(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	request.Header.Set("Origin", "https://example.com")
	response := httptest.NewRecorder()

	NewRouter().ServeHTTP(response, request)

	if origin := response.Header().Get("Access-Control-Allow-Origin"); origin != "" {
		t.Fatalf("expected no allowed origin header, got %q", origin)
	}
}

func TestCORSHandlesPreflight(t *testing.T) {
	request := httptest.NewRequest(http.MethodOptions, "/api/events", nil)
	request.Header.Set("Origin", "http://127.0.0.1:5173")
	request.Header.Set("Access-Control-Request-Method", http.MethodGet)
	request.Header.Set("Access-Control-Request-Headers", "Accept")
	response := httptest.NewRecorder()

	NewRouter().ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d", http.StatusNoContent, response.Code)
	}

	if origin := response.Header().Get("Access-Control-Allow-Origin"); origin != "http://127.0.0.1:5173" {
		t.Fatalf("expected allowed origin header, got %q", origin)
	}

	if methods := response.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(methods, http.MethodGet) {
		t.Fatalf("expected allowed methods to contain GET, got %q", methods)
	}

	if headers := response.Header().Get("Access-Control-Allow-Headers"); !strings.Contains(headers, "Accept") {
		t.Fatalf("expected allowed headers to contain Accept, got %q", headers)
	}
}

func containsHeaderValue(values []string, expected string) bool {
	for _, value := range values {
		for _, part := range strings.Split(value, ",") {
			if strings.TrimSpace(part) == expected {
				return true
			}
		}
	}

	return false
}

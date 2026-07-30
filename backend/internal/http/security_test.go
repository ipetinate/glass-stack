package httpserver

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestValidRequestOrigin(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest(http.MethodPost, "http://glass.local/api/v1/auth/logout", nil)
	request.Host = "glass.local"
	request.Header.Set("Origin", "http://glass.local")
	if !validRequestOrigin(request, nil) {
		t.Fatal("same-origin request was rejected")
	}

	request.Header.Set("Origin", "https://dashboard.example")
	if !validRequestOrigin(request, map[string]struct{}{"https://dashboard.example": {}}) {
		t.Fatal("configured origin was rejected")
	}

	request.Header.Set("Origin", "https://attacker.example")
	if validRequestOrigin(request, map[string]struct{}{"https://dashboard.example": {}}) {
		t.Fatal("unconfigured origin was accepted")
	}
}

func TestRateLimit(t *testing.T) {
	t.Parallel()

	limiter := &rateLimiter{
		entries: make(map[string]rateLimitEntry),
		limit:   2,
		window:  time.Minute,
		now:     time.Now,
	}
	handler := limiter.middleware(http.HandlerFunc(func(response http.ResponseWriter, _ *http.Request) {
		response.WriteHeader(http.StatusNoContent)
	}))

	for attempt, expected := range []int{
		http.StatusNoContent,
		http.StatusNoContent,
		http.StatusTooManyRequests,
	} {
		response := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodPost, "/", nil)
		request.RemoteAddr = "192.0.2.1:4000"
		handler.ServeHTTP(response, request)
		if response.Code != expected {
			t.Fatalf("attempt %d status = %d, want %d", attempt+1, response.Code, expected)
		}
	}
}

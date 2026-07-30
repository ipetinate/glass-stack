package httpserver

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/auth"
	"github.com/ipetinate/glass-stack/backend/internal/platform/database"
	"github.com/ipetinate/glass-stack/backend/internal/settings"
)

func TestPreferencesHTTPContract(t *testing.T) {
	t.Parallel()

	router, credentials := newAuthenticatedTestRouter(t)

	t.Run("authentication required", func(t *testing.T) {
		response := serveRequest(
			router,
			httptest.NewRequest(http.MethodGet, "/api/v1/users/me/preferences", nil),
		)
		if response.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		assertErrorCode(t, response, "authentication_required")
		assertResponseRequestID(t, response)
	})

	t.Run("authenticated read", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/api/v1/users/me/preferences", nil)
		request.AddCookie(&http.Cookie{Name: SessionCookieName, Value: credentials.session})
		response := serveRequest(router, request)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var record settings.PreferenceRecord
		if err := json.Unmarshal(response.Body.Bytes(), &record); err != nil {
			t.Fatal(err)
		}
		if record.Revision != 1 || record.Preferences.Theme != "system" {
			t.Fatalf("record = %+v", record)
		}
	})

	updatedPreferences := settings.DefaultPreferences()
	updatedPreferences.Theme = "dark"
	updatedPreferences.WallpaperID = "preset-dark"
	body, err := json.Marshal(map[string]any{
		"revision":    1,
		"preferences": updatedPreferences,
	})
	if err != nil {
		t.Fatal(err)
	}

	t.Run("CSRF required for mutation", func(t *testing.T) {
		request := httptest.NewRequest(
			http.MethodPatch,
			"http://glass.local/api/v1/users/me/preferences",
			bytes.NewReader(body),
		)
		request.Host = "glass.local"
		request.Header.Set("Content-Type", "application/json")
		request.Header.Set("Origin", "http://glass.local")
		request.AddCookie(&http.Cookie{Name: SessionCookieName, Value: credentials.session})
		response := serveRequest(router, request)
		if response.Code != http.StatusForbidden {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		assertErrorCode(t, response, "csrf_rejected")
	})

	t.Run("untrusted origin rejected", func(t *testing.T) {
		request := authenticatedMutationRequest(
			http.MethodPatch,
			"http://glass.local/api/v1/users/me/preferences",
			body,
			credentials,
		)
		request.Header.Set("Origin", "https://attacker.example")
		response := serveRequest(router, request)
		if response.Code != http.StatusForbidden {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		assertErrorCode(t, response, "origin_rejected")
	})

	t.Run("same-origin update persists", func(t *testing.T) {
		request := authenticatedMutationRequest(
			http.MethodPatch,
			"http://glass.local/api/v1/users/me/preferences",
			body,
			credentials,
		)
		response := serveRequest(router, request)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var record settings.PreferenceRecord
		if err := json.Unmarshal(response.Body.Bytes(), &record); err != nil {
			t.Fatal(err)
		}
		if record.Revision != 2 ||
			record.Preferences.Theme != "dark" ||
			record.Preferences.WallpaperID != "preset-dark" {
			t.Fatalf("record = %+v", record)
		}
	})

	t.Run("stale revision conflicts", func(t *testing.T) {
		request := authenticatedMutationRequest(
			http.MethodPatch,
			"http://glass.local/api/v1/users/me/preferences",
			body,
			credentials,
		)
		response := serveRequest(router, request)
		if response.Code != http.StatusConflict {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		assertErrorCode(t, response, "revision_conflict")
	})
}

func TestInvalidSessionClearsAuthCookies(t *testing.T) {
	t.Parallel()

	router, _ := newAuthenticatedTestRouter(t)
	request := httptest.NewRequest(http.MethodGet, "/api/v1/users/me/preferences", nil)
	request.AddCookie(&http.Cookie{Name: SessionCookieName, Value: "invalid-session"})
	response := serveRequest(router, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	cleared := map[string]bool{}
	for _, cookie := range response.Result().Cookies() {
		if cookie.MaxAge < 0 {
			cleared[cookie.Name] = true
		}
	}
	if !cleared[SessionCookieName] || !cleared[CSRFCookieName] {
		t.Fatalf("cleared cookies = %+v", cleared)
	}
}

type testCredentials struct {
	session string
	csrf    string
}

type safeHTTPPasswordChecker struct{}

func (safeHTTPPasswordChecker) Check(
	context.Context,
	auth.PasswordDigest,
) (auth.PasswordCompromiseResult, error) {
	return auth.PasswordCompromiseResult{Complete: true}, nil
}

func newAuthenticatedTestRouter(
	t *testing.T,
) (http.Handler, testCredentials) {
	t.Helper()

	ctx := context.Background()
	db, err := database.Open(ctx, filepath.Join(t.TempDir(), "glass-stack.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })

	now := time.Now().UTC()
	const userID = "test-user"
	preferences, err := json.Marshal(settings.DefaultPreferences())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.SQL().ExecContext(
		ctx,
		`INSERT INTO users(
			id, username, username_normalized, password_hash, role, status,
			created_at, updated_at, password_changed_at
		) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		userID,
		"owner",
		"owner",
		"unused-in-http-contract-test",
		auth.RoleAdmin,
		"active",
		now.Format(time.RFC3339Nano),
		now.Format(time.RFC3339Nano),
		now.Format(time.RFC3339Nano),
	); err != nil {
		t.Fatal(err)
	}
	if _, err := db.SQL().ExecContext(
		ctx,
		`INSERT INTO user_preferences(user_id, revision, preferences_json, updated_at)
		 VALUES(?, 1, ?, ?)`,
		userID,
		string(preferences),
		now.Format(time.RFC3339Nano),
	); err != nil {
		t.Fatal(err)
	}

	credentials := testCredentials{
		session: "test-session-token",
		csrf:    "test-csrf-token",
	}
	sessionHash := sha256.Sum256([]byte(credentials.session))
	csrfHash := sha256.Sum256([]byte(credentials.csrf))
	if err := database.NewAuthStore(db).CreateSession(ctx, auth.Session{
		TokenHash:         sessionHash[:],
		UserID:            userID,
		CSRFHash:          csrfHash[:],
		CreatedAt:         now,
		LastSeenAt:        now,
		IdleExpiresAt:     now.Add(time.Hour),
		AbsoluteExpiresAt: now.Add(2 * time.Hour),
	}); err != nil {
		t.Fatal(err)
	}
	authService, err := auth.NewService(
		database.NewAuthStore(db),
		make([]byte, 32),
		safeHTTPPasswordChecker{},
		slog.New(slog.NewTextHandler(io.Discard, nil)),
	)
	if err != nil {
		t.Fatal(err)
	}
	settingsService := settings.NewService(
		database.NewSettingsStore(db),
		nil,
		nil,
		false,
	)
	return NewRouterWithRuntime(&Runtime{
		Auth:           authService,
		Settings:       settingsService,
		Database:       db,
		AllowedOrigins: []string{"http://glass.local"},
	}), credentials
}

func authenticatedMutationRequest(
	method string,
	target string,
	body []byte,
	credentials testCredentials,
) *http.Request {
	request := httptest.NewRequest(method, target, bytes.NewReader(body))
	request.Host = "glass.local"
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Origin", "http://glass.local")
	request.Header.Set("X-CSRF-Token", credentials.csrf)
	request.AddCookie(&http.Cookie{Name: SessionCookieName, Value: credentials.session})
	return request
}

func serveRequest(handler http.Handler, request *http.Request) *httptest.ResponseRecorder {
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func assertErrorCode(
	t *testing.T,
	response *httptest.ResponseRecorder,
	expected string,
) {
	t.Helper()
	var envelope struct {
		Code string `json:"code"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &envelope); err != nil {
		t.Fatal(err)
	}
	if envelope.Code != expected {
		t.Fatalf("error code = %q, want %q", envelope.Code, expected)
	}
}

func assertResponseRequestID(
	t *testing.T,
	response *httptest.ResponseRecorder,
) {
	t.Helper()
	requestID := response.Header().Get(RequestIDHeader)
	if requestID == "" {
		t.Fatal("response has no request ID header")
	}
	var envelope struct {
		RequestID string `json:"requestId"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &envelope); err != nil {
		t.Fatal(err)
	}
	if envelope.RequestID != requestID {
		t.Fatalf("error request ID = %q, want %q", envelope.RequestID, requestID)
	}
}

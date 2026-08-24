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

func TestAuthIdentitiesAndUnlockHTTPContract(t *testing.T) {
	t.Parallel()

	passwordHash, err := auth.HashPassword("correct but unique passphrase")
	if err != nil {
		t.Fatal(err)
	}
	router, credentials := newLockTestRouter(t, string(passwordHash))

	t.Run("identities are public", func(t *testing.T) {
		response := serveRequest(
			router,
			httptest.NewRequest(http.MethodGet, "/api/v1/auth/identities", nil),
		)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var payload struct {
			Identities []struct {
				ID             string `json:"id"`
				Username       string `json:"username"`
				Role           string `json:"role"`
				DisplayName    string `json:"displayName"`
				AvatarURL      string `json:"avatarUrl"`
				AvatarPresetID string `json:"avatarPresetId"`
			} `json:"identities"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
			t.Fatal(err)
		}
		if len(payload.Identities) != 1 {
			t.Fatalf("identities = %+v", payload.Identities)
		}
		identity := payload.Identities[0]
		if identity.Username != "owner" ||
			identity.Role != string(auth.RoleAdmin) ||
			identity.DisplayName != "Owner" ||
			identity.AvatarPresetID != "admin" ||
			identity.AvatarURL != "" {
			t.Fatalf("identity = %+v", identity)
		}
	})

	body := func() []byte {
		encoded, err := json.Marshal(map[string]string{"password": "correct but unique passphrase"})
		if err != nil {
			t.Fatal(err)
		}
		return encoded
	}()

	t.Run("unlock requires CSRF", func(t *testing.T) {
		request := httptest.NewRequest(
			http.MethodPost,
			"http://glass.local/api/v1/auth/unlock",
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

	t.Run("unlock with correct password", func(t *testing.T) {
		request := authenticatedMutationRequest(
			http.MethodPost,
			"http://glass.local/api/v1/auth/unlock",
			body,
			credentials,
		)
		request.AddCookie(&http.Cookie{Name: CSRFCookieName, Value: credentials.csrf})
		response := serveRequest(router, request)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var payload struct {
			User      struct {
				ID       string `json:"id"`
				Username string `json:"username"`
			} `json:"user"`
			CSRFToken string `json:"csrfToken"`
			ExpiresAt string `json:"expiresAt"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
			t.Fatal(err)
		}
		if payload.User.Username != "owner" ||
			payload.CSRFToken != credentials.csrf ||
			payload.ExpiresAt == "" {
			t.Fatalf("payload = %+v", payload)
		}
	})

	t.Run("unlock with wrong password", func(t *testing.T) {
		wrongBody, _ := json.Marshal(map[string]string{"password": "wrong passphrase"})
		request := authenticatedMutationRequest(
			http.MethodPost,
			"http://glass.local/api/v1/auth/unlock",
			wrongBody,
			credentials,
		)
		request.AddCookie(&http.Cookie{Name: CSRFCookieName, Value: credentials.csrf})
		response := serveRequest(router, request)
		if response.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		assertErrorCode(t, response, "invalid_credentials")
	})
}

func newLockTestRouter(
	t *testing.T,
	passwordHash string,
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
	preferences := settings.DefaultPreferences()
	preferences.DisplayName = "Owner"
	preferences.AvatarPresetID = "admin"
	encoded, err := json.Marshal(preferences)
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
		passwordHash,
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
		string(encoded),
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
	return NewRouterWithRuntime(&Runtime{
		Auth:           authService,
		Settings:       settings.NewService(database.NewSettingsStore(db), nil, nil, false),
		Database:       db,
		AllowedOrigins: []string{"http://glass.local"},
	}), credentials
}

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
	"strings"
	"testing"
	"time"

	"github.com/ipetinate/glass-stack/backend/internal/apps"
	"github.com/ipetinate/glass-stack/backend/internal/auth"
	"github.com/ipetinate/glass-stack/backend/internal/containers"
	"github.com/ipetinate/glass-stack/backend/internal/docker"
	"github.com/ipetinate/glass-stack/backend/internal/http/handlers"
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
	runtime, credentials := newAuthenticatedTestRuntime(t, nil)
	return NewRouterWithRuntime(runtime), credentials
}

func newAuthenticatedTestRuntime(
	t *testing.T,
	containers handlers.ContainerOperations,
) (*Runtime, testCredentials) {
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
	return &Runtime{
		Auth:           authService,
		Settings:       settingsService,
		Database:       db,
		Containers:     containers,
		AllowedOrigins: []string{"http://glass.local"},
	}, credentials
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

type dockerEngineServiceStub struct {
	status    docker.EngineStatus
	records   []docker.ContainerRecord
	detail    docker.ContainerDetail
	detailErr error
	actions   *[]string
	logLines  []docker.LogLine
	stats     docker.ContainerStats
	events    []docker.EventMessage
}

func (stub dockerEngineServiceStub) Status(context.Context) docker.EngineStatus {
	return stub.status
}

func (stub dockerEngineServiceStub) List(context.Context) ([]docker.ContainerRecord, error) {
	return stub.records, nil
}

func (stub dockerEngineServiceStub) Detail(_ context.Context, id string) (docker.ContainerDetail, error) {
	if stub.detailErr != nil {
		return docker.ContainerDetail{}, stub.detailErr
	}
	return stub.detail, nil
}

func (stub dockerEngineServiceStub) Lifecycle(_ context.Context, action containers.LifecycleAction, _ string) error {
	if stub.actions != nil {
		*stub.actions = append(*stub.actions, string(action))
	}
	return nil
}

func (stub dockerEngineServiceStub) Logs(_ context.Context, _ string, _ docker.LogQuery) ([]docker.LogLine, error) {
	return stub.logLines, nil
}

func (stub dockerEngineServiceStub) StreamLogs(
	_ context.Context,
	_ string,
	_ docker.LogQuery,
	emit func(docker.LogLine) error,
) error {
	for _, line := range stub.logLines {
		if err := emit(line); err != nil {
			return err
		}
	}
	return nil
}

func (stub dockerEngineServiceStub) Stats(_ context.Context, id string) (docker.ContainerStats, error) {
	stats := stub.stats
	if id != "" && stats.ID == "" {
		stats.ID = id
	}
	return stats, nil
}

func (stub dockerEngineServiceStub) StreamEvents(
	_ context.Context,
	emit func(docker.EventMessage) error,
) error {
	for _, event := range stub.events {
		if err := emit(event); err != nil {
			return err
		}
	}
	return nil
}

type appsServiceStub struct {
	queuedOperation apps.Operation
	installErr      error
	operation       apps.InstallOperation
	installed       []apps.InstalledApp
}

func (stub *appsServiceStub) Install(
	_ context.Context,
	request apps.InstallRequest,
) (apps.Operation, error) {
	if stub.installErr != nil {
		return apps.Operation{}, stub.installErr
	}
	if request.AppID != stub.queuedOperation.AppID {
		return apps.Operation{}, apps.ErrApplicationNotFound
	}
	return stub.queuedOperation, nil
}

func (stub *appsServiceStub) Operation(_ context.Context, id string) (apps.InstallOperation, error) {
	if id != stub.queuedOperation.ID {
		return apps.InstallOperation{}, apps.ErrNotFound
	}
	return stub.operation, nil
}

func (stub *appsServiceStub) Update(_ context.Context, appID string) (apps.Operation, error) {
	if appID != stub.queuedOperation.AppID {
		return apps.Operation{}, apps.ErrNotInstalled
	}
	operation := stub.queuedOperation
	operation.Kind = apps.OperationKindUpdate
	return operation, nil
}

func (stub *appsServiceStub) Edit(_ context.Context, appID, mode string, options apps.InstallOptions) (apps.Operation, error) {
	if appID != stub.queuedOperation.AppID {
		return apps.Operation{}, apps.ErrNotInstalled
	}
	operation := stub.queuedOperation
	operation.Kind = apps.OperationKindEdit
	return operation, nil
}

func (stub *appsServiceStub) Remove(_ context.Context, request apps.RemoveRequest) (apps.Operation, error) {
	if request.AppID != stub.queuedOperation.AppID {
		return apps.Operation{}, apps.ErrNotInstalled
	}
	operation := stub.queuedOperation
	operation.Kind = apps.OperationKindRemove
	return operation, nil
}

func (stub *appsServiceStub) Apps(_ context.Context) ([]apps.InstalledApp, error) {
	return stub.installed, nil
}

func (stub *appsServiceStub) App(_ context.Context, appID string) (apps.InstalledApp, error) {
	for _, installed := range stub.installed {
		if installed.ID == appID {
			return installed, nil
		}
	}
	return apps.InstalledApp{}, apps.ErrNotInstalled
}

func TestDockerHTTPContract(t *testing.T) {
	t.Parallel()

	actions := &[]string{}
	runtime, credentials := newAuthenticatedTestRuntime(t, dockerEngineServiceStub{
		status: docker.EngineStatus{
			Connected:         true,
			ServerVersion:     "27.4.1",
			APIVersion:        "1.47",
			ComposeAvailable:  true,
			ContainersTotal:   3,
			ContainersRunning: 1,
		},
		records: []docker.ContainerRecord{{
			ID:     "abc123",
			Name:   "uptime-kuma",
			State:  "running",
			Status: "Up 2 hours",
		}},
		detail: docker.ContainerDetail{
			Name:        "uptime-kuma",
			State:       "running",
			Health:      "healthy",
			Image:       "louislam/uptime-kuma:1.23.16",
			Environment: []string{"TOKEN=secret"},
		},
		actions:  actions,
		logLines: []docker.LogLine{{Stream: "stdout", Line: "ready"}},
		stats: docker.ContainerStats{
			ID:            "abc123",
			CPUPercent:    40,
			MemoryUsed:    10485760,
			MemoryLimit:   268435456,
			MemoryPercent: 3.9,
			Pids:          7,
		},
		events: []docker.EventMessage{
			{Type: "container", Action: "start", Actor: "abc123def456"},
		},
	})
	router := NewRouterWithRuntime(runtime)

	t.Run("authentication required", func(t *testing.T) {
		for _, request := range []struct {
			method string
			target string
		}{
			{http.MethodGet, "/api/v1/docker/status"},
			{http.MethodGet, "/api/v1/docker/events"},
			{http.MethodGet, "/api/v1/containers"},
			{http.MethodGet, "/api/v1/containers/abc123"},
			{http.MethodPost, "/api/v1/containers/abc123/stop"},
			{http.MethodGet, "/api/v1/containers/abc123/logs?tail=10"},
			{http.MethodGet, "/api/v1/containers/abc123/stats"},
		} {
			response := serveRequest(
				router,
				httptest.NewRequest(request.method, request.target, nil),
			)
			if response.Code != http.StatusUnauthorized {
				t.Fatalf(
					"%s %s status = %d, body = %s",
					request.method,
					request.target,
					response.Code,
					response.Body.String(),
				)
			}
			assertErrorCode(t, response, "authentication_required")
		}
	})

	t.Run("docker status", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/api/v1/docker/status", nil)
		request.AddCookie(&http.Cookie{Name: SessionCookieName, Value: credentials.session})
		response := serveRequest(router, request)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var status docker.EngineStatus
		if err := json.Unmarshal(response.Body.Bytes(), &status); err != nil {
			t.Fatal(err)
		}
		if !status.Connected || status.ServerVersion != "27.4.1" ||
			status.ContainersTotal != 3 || status.ContainersRunning != 1 {
			t.Fatalf("status = %+v", status)
		}
	})

	t.Run("containers inventory", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/api/v1/containers", nil)
		request.AddCookie(&http.Cookie{Name: SessionCookieName, Value: credentials.session})
		response := serveRequest(router, request)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var result struct {
			Data  []docker.ContainerRecord `json:"data"`
			Total int                      `json:"total"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if result.Total != 1 || len(result.Data) != 1 || result.Data[0].Name != "uptime-kuma" {
			t.Fatalf("result = %+v", result)
		}
	})

	t.Run("container detail redacts secrets", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/api/v1/containers/abc123", nil)
		request.AddCookie(&http.Cookie{Name: SessionCookieName, Value: credentials.session})
		response := serveRequest(router, request)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var result struct {
			Data docker.ContainerDetail `json:"data"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if result.Data.Name != "uptime-kuma" || result.Data.Health != "healthy" {
			t.Fatalf("result = %+v", result)
		}
		if got := result.Data.Environment; len(got) != 1 || got[0] != "TOKEN=***" {
			t.Fatalf("environment = %v", got)
		}
	})

	t.Run("container lifecycle start", func(t *testing.T) {
		request := authenticatedMutationRequest(
			http.MethodPost,
			"/api/v1/containers/abc123/start",
			nil,
			credentials,
		)
		response := serveRequest(router, request)
		if response.Code != http.StatusAccepted {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		if got := strings.Join(*actions, ","); got != "start" {
			t.Fatalf("actions = %q", got)
		}
	})

	t.Run("container logs recent", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/api/v1/containers/abc123/logs?tail=10", nil)
		request.AddCookie(&http.Cookie{Name: SessionCookieName, Value: credentials.session})
		response := serveRequest(router, request)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var result struct {
			Data []docker.LogLine `json:"data"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if len(result.Data) != 1 || result.Data[0].Line != "ready" {
			t.Fatalf("result = %+v", result)
		}
	})

	t.Run("container stats", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/api/v1/containers/abc123/stats", nil)
		request.AddCookie(&http.Cookie{Name: SessionCookieName, Value: credentials.session})
		response := serveRequest(router, request)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var result struct {
			Data docker.ContainerStats `json:"data"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if result.Data.ID != "abc123" || result.Data.CPUPercent != 40 ||
			result.Data.MemoryLimit != 268435456 || result.Data.Pids != 7 {
			t.Fatalf("result = %+v", result)
		}
	})

	t.Run("docker events sse", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/api/v1/docker/events", nil)
		request.AddCookie(&http.Cookie{Name: SessionCookieName, Value: credentials.session})
		response := serveRequest(router, request)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		if contentType := response.Header().Get("Content-Type"); !strings.HasPrefix(contentType, "text/event-stream") {
			t.Fatalf("content type = %q", contentType)
		}
		body := response.Body.String()
		for _, want := range []string{
			`"type":"docker.event"`,
			`"action":"start"`,
			`"actor":"abc123def456"`,
		} {
			if !strings.Contains(body, want) {
				t.Fatalf("body missing %s:\n%s", want, body)
			}
		}
	})
}

func TestAppsHTTPContract(t *testing.T) {
	t.Parallel()

	runtime, credentials := newAuthenticatedTestRuntime(t, nil)
	runtime.Apps = &appsServiceStub{
		queuedOperation: apps.Operation{
			ID: "op-1", AppID: "uptime-kuma", Kind: apps.OperationKindInstall,
			Status: apps.OperationQueued, Progress: 0, Message: "fila",
		},
		operation: apps.InstallOperation{
			ID: "op-1", AppID: "uptime-kuma", Status: "installing", Progress: 30,
			Message: "aplicando",
		},
		installed: []apps.InstalledApp{{
			ID: "uptime-kuma", Title: "Uptime Kuma", Version: "1.23.16",
			Status: apps.InstanceInstalled, Runtime: apps.RuntimeRunning,
			AccessURL: "http://localhost:3001/",
		}},
	}
	router := NewRouterWithRuntime(runtime)

	t.Run("authentication required", func(t *testing.T) {
		for _, request := range []struct {
			method string
			target string
		}{
			{http.MethodGet, "/api/v1/apps"},
			{http.MethodGet, "/api/v1/apps/uptime-kuma"},
			{http.MethodGet, "/api/v1/apps/install/op-1"},
			{http.MethodPost, "/api/v1/apps/install"},
			{http.MethodPost, "/api/v1/apps/uptime-kuma/update"},
			{http.MethodPatch, "/api/v1/apps/uptime-kuma"},
			{http.MethodPost, "/api/v1/apps/uptime-kuma/remove"},
		} {
			response := serveRequest(
				router,
				httptest.NewRequest(request.method, request.target, nil),
			)
			if response.Code != http.StatusUnauthorized {
				t.Fatalf(
					"%s %s status = %d, body = %s",
					request.method, request.target, response.Code, response.Body.String(),
				)
			}
			assertErrorCode(t, response, "authentication_required")
		}
	})

	t.Run("install accepted", func(t *testing.T) {
		request := authenticatedMutationRequest(
			http.MethodPost,
			"/api/v1/apps/install",
			[]byte(`{"appId":"uptime-kuma","mode":"standard"}`),
			credentials,
		)
		response := serveRequest(router, request)
		if response.Code != http.StatusAccepted {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var result struct {
			Data apps.InstallOperation `json:"data"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if result.Data.ID != "op-1" || result.Data.Status != "installing" {
			t.Fatalf("result = %+v", result)
		}
		for _, key := range []string{`"id":"op-1"`, `"appId":"uptime-kuma"`, `"status":"installing"`, `"progress"`, `"message"`} {
			if !strings.Contains(response.Body.String(), key) {
				t.Fatalf("camelCase key %s missing from body: %s", key, response.Body.String())
			}
		}
	})

	t.Run("install unknown app", func(t *testing.T) {
		request := authenticatedMutationRequest(
			http.MethodPost,
			"/api/v1/apps/install",
			[]byte(`{"appId":"ghost"}`),
			credentials,
		)
		response := serveRequest(router, request)
		if response.Code != http.StatusNotFound {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		assertErrorCode(t, response, "app_not_found")
	})

	t.Run("operation status", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/api/v1/apps/install/op-1", nil)
		request.AddCookie(&http.Cookie{Name: SessionCookieName, Value: credentials.session})
		response := serveRequest(router, request)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var result struct {
			Data apps.InstallOperation `json:"data"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if result.Data.Progress != 30 || result.Data.Status != "installing" {
			t.Fatalf("result = %+v", result)
		}
	})

	t.Run("update accepted", func(t *testing.T) {
		request := authenticatedMutationRequest(
			http.MethodPost,
			"/api/v1/apps/uptime-kuma/update",
			nil,
			credentials,
		)
		response := serveRequest(router, request)
		if response.Code != http.StatusAccepted {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var result struct {
			Data apps.InstallOperation `json:"data"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if result.Data.ID != "op-1" || result.Data.Status != "updating" {
			t.Fatalf("result = %+v", result)
		}
	})

	t.Run("edit accepted", func(t *testing.T) {
		request := authenticatedMutationRequest(
			http.MethodPatch,
			"/api/v1/apps/uptime-kuma",
			[]byte(`{"mode":"custom","options":{"port":9090,"volume":"v"}}`),
			credentials,
		)
		response := serveRequest(router, request)
		if response.Code != http.StatusAccepted {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var result struct {
			Data apps.InstallOperation `json:"data"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if result.Data.ID != "op-1" || result.Data.Status != "editing" {
			t.Fatalf("result = %+v", result)
		}
	})

	t.Run("remove accepted", func(t *testing.T) {
		request := authenticatedMutationRequest(
			http.MethodPost,
			"/api/v1/apps/uptime-kuma/remove",
			[]byte(`{"containers":true,"images":true,"config":true,"data":true}`),
			credentials,
		)
		response := serveRequest(router, request)
		if response.Code != http.StatusAccepted {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var result struct {
			Data apps.InstallOperation `json:"data"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if result.Data.ID != "op-1" || result.Data.Status != "removing" {
			t.Fatalf("result = %+v", result)
		}
	})

	t.Run("apps list", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/api/v1/apps", nil)
		request.AddCookie(&http.Cookie{Name: SessionCookieName, Value: credentials.session})
		response := serveRequest(router, request)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var result struct {
			Data []apps.InstalledApp `json:"data"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if len(result.Data) != 1 || result.Data[0].ID != "uptime-kuma" ||
			result.Data[0].Title != "Uptime Kuma" ||
			result.Data[0].AccessURL != "http://localhost:3001/" ||
			result.Data[0].Status != apps.InstanceInstalled ||
			result.Data[0].Runtime != apps.RuntimeRunning {
			t.Fatalf("result = %+v", result)
		}
		body := response.Body.String()
		for _, key := range []string{`"id":"uptime-kuma"`, `"title"`, `"version"`, `"status"`, `"runtime"`, `"accessUrl"`, `"options"`, `"lastError"`, `"updatedAt"`} {
			if !strings.Contains(body, key) {
				t.Fatalf("camelCase key %s missing from body: %s", key, body)
			}
		}
	})

	t.Run("app detail", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/api/v1/apps/uptime-kuma", nil)
		request.AddCookie(&http.Cookie{Name: SessionCookieName, Value: credentials.session})
		response := serveRequest(router, request)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		var result struct {
			Data apps.InstalledApp `json:"data"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if result.Data.ID != "uptime-kuma" || result.Data.AccessURL != "http://localhost:3001/" {
			t.Fatalf("result = %+v", result)
		}
	})

	t.Run("app detail not installed", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/api/v1/apps/ghost", nil)
		request.AddCookie(&http.Cookie{Name: SessionCookieName, Value: credentials.session})
		response := serveRequest(router, request)
		if response.Code != http.StatusNotFound {
			t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
		}
		assertErrorCode(t, response, "app_not_installed")
	})
}
